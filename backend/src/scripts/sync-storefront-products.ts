import { supabaseAdmin } from '../database/supabase.js';

type CachedProduct = {
  tiny_id: string;
  name: string;
  image_url: string | null;
  raw_payload: Record<string, unknown> | null;
};

type StoreProduct = {
  url: string;
  name: string;
  imageUrl: string | null;
  description: string | null;
};

const sitemapUrl = 'https://www.belaways.com.br/loja/arquivos/1300980/sitemaps/sitemap_1.xml';
const concurrency = Math.max(Number(process.env.STOREFRONT_SYNC_CONCURRENCY ?? 8), 1);
const minScore = Number(process.env.STOREFRONT_SYNC_MIN_SCORE ?? 0.55);
const supabasePageSize = 1000;

const decoder = new TextDecoder('iso-8859-1');

const stopWords = new Set([
  'com',
  'sem',
  'para',
  'por',
  'dos',
  'das',
  'uma',
  'uma',
  'the',
  'and',
  'kit',
  'produto',
  'profissional',
]);

const fetchText = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Belaways ERP Sync/1.0',
    },
  });

  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

  const buffer = await response.arrayBuffer();
  return decoder.decode(buffer);
};

const decodeHtml = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#034;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalize = (value: string) =>
  decodeHtml(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokens = (value: string) =>
  normalize(value)
    .split(' ')
    .filter((token) => token.length > 1 && !stopWords.has(token));

const similarity = (storeName: string, cacheName: string) => {
  const storeNorm = normalize(storeName);
  const cacheNorm = normalize(cacheName);

  if (!storeNorm || !cacheNorm) return 0;
  if (storeNorm === cacheNorm) return 1;
  if (storeNorm.includes(cacheNorm) || cacheNorm.includes(storeNorm)) return 0.92;

  const storeTokens = new Set(tokens(storeName));
  const cacheTokens = new Set(tokens(cacheName));
  const intersection = [...storeTokens].filter((token) => cacheTokens.has(token)).length;
  const denominator = Math.max(storeTokens.size, cacheTokens.size, 1);

  return intersection / denominator;
};

const extractUrls = (sitemap: string) =>
  [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map((match) => decodeHtml(match[1] ?? ''))
    .filter((url) => url.includes('belaways.com.br/'));

const extractMeta = (html: string, property: string) => {
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    'i',
  );
  return decodeHtml(html.match(pattern)?.[1] ?? '');
};

const extractJsonLdProduct = (html: string): Partial<StoreProduct> => {
  const scripts = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];

  for (const script of scripts) {
    try {
      const json = JSON.parse(script[1] ?? '{}') as Record<string, unknown>;
      if (json['@type'] !== 'Product') continue;

      const image = json.image;
      return {
        name: typeof json.name === 'string' ? decodeHtml(json.name) : undefined,
        description:
          typeof json.description === 'string' ? decodeHtml(json.description).slice(0, 4000) : undefined,
        imageUrl: Array.isArray(image) ? String(image[0] ?? '') : typeof image === 'string' ? image : undefined,
      };
    } catch {
      continue;
    }
  }

  return {};
};

const firstProductImage = (html: string) => {
  const ogImage = extractMeta(html, 'og:image');
  if (ogImage.includes('images.tcdn.com.br/img/img_prod/1300980/')) return ogImage;

  const image = html.match(
    /https:\/\/images\.tcdn\.com\.br\/img\/img_prod\/1300980\/(?!171263|170991|90_)[^"'<> ]+\.(?:png|jpg|jpeg|webp)(?:\?[^"'<> ]*)?/i,
  )?.[0];

  return image ? decodeHtml(image) : null;
};

const loadCachedProducts = async () => {
  if (!supabaseAdmin) throw new Error('Supabase service role is not configured.');

  const products: CachedProduct[] = [];

  for (let from = 0; ; from += supabasePageSize) {
    const { data, error } = await supabaseAdmin
      .from('product_cache')
      .select('tiny_id,name,image_url,raw_payload')
      .order('name', { ascending: true })
      .range(from, from + supabasePageSize - 1);

    if (error) throw error;

    products.push(...((data ?? []) as CachedProduct[]));
    if ((data?.length ?? 0) < supabasePageSize) break;
  }

  return products;
};

const extractStoreProduct = async (url: string): Promise<StoreProduct | null> => {
  try {
    const html = await fetchText(url);
    const jsonLd = extractJsonLdProduct(html);
    const title = extractMeta(html, 'og:title').replace(' - Belaways Cosméticos', '');
    const name = jsonLd.name || title;
    const imageUrl = jsonLd.imageUrl || firstProductImage(html);

    if (!name || !imageUrl) return null;

    return {
      url,
      name,
      imageUrl,
      description: jsonLd.description || extractMeta(html, 'description') || null,
    };
  } catch (error) {
    console.warn(`Falha vitrine ${url} - ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
};

const bestMatch = (storeProduct: StoreProduct, cachedProducts: CachedProduct[]) => {
  let best: { product: CachedProduct; score: number } | null = null;

  for (const product of cachedProducts) {
    const score = similarity(storeProduct.name, product.name);
    if (!best || score > best.score) best = { product, score };
  }

  return best && best.score >= minScore ? best : null;
};

const run = async () => {
  if (!supabaseAdmin) throw new Error('Supabase service role is not configured.');

  const [sitemap, cachedProducts] = await Promise.all([fetchText(sitemapUrl), loadCachedProducts()]);
  const urls = extractUrls(sitemap);
  console.log(`URLs da vitrine: ${urls.length}`);
  console.log(`Produtos no cache: ${cachedProducts.length}`);

  let processed = 0;
  let matched = 0;
  let updated = 0;
  let skipped = 0;

  for (let index = 0; index < urls.length; index += concurrency) {
    const group = urls.slice(index, index + concurrency);
    const storeProducts = (await Promise.all(group.map(extractStoreProduct))).filter(
      (product): product is StoreProduct => Boolean(product),
    );

    for (const storeProduct of storeProducts) {
      const match = bestMatch(storeProduct, cachedProducts);
      if (!match) {
        skipped += 1;
        continue;
      }

      matched += 1;
      const currentRawPayload = match.product.raw_payload ?? {};
      const { error } = await supabaseAdmin
        .from('product_cache')
        .update({
          image_url: match.product.image_url || storeProduct.imageUrl,
          raw_payload: {
            ...currentRawPayload,
            storefront_url: storeProduct.url,
            storefront_name: storeProduct.name,
            storefront_description: storeProduct.description,
            storefront_match_score: match.score,
          },
          synced_at: new Date().toISOString(),
        })
        .eq('tiny_id', match.product.tiny_id);

      if (error) throw error;
      updated += 1;

      match.product.image_url = match.product.image_url || storeProduct.imageUrl;
      match.product.raw_payload = {
        ...currentRawPayload,
        storefront_url: storeProduct.url,
        storefront_name: storeProduct.name,
        storefront_description: storeProduct.description,
        storefront_match_score: match.score,
      };
    }

    processed += group.length;
    console.log(`Vitrine ${processed}/${urls.length} | casados ${matched} | atualizados ${updated} | pulados ${skipped}`);
  }

  console.log(JSON.stringify({ urls: urls.length, matched, updated, skipped }, null, 2));
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
