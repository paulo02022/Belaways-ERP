import { supabaseAdmin } from '../database/supabase.js';

type CachedProduct = {
  tiny_id: string;
  name: string;
  brand: string | null;
  category: string | null;
  image_url: string | null;
  raw_payload: Record<string, unknown> | null;
};

type ShopifyCatalogProduct = {
  id: number;
  title: string;
  handle: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  images?: Array<{
    src?: string;
    width?: number;
    height?: number;
  }>;
};

type Store = {
  key: string;
  baseUrl: string;
};

type StoreProduct = ShopifyCatalogProduct & {
  storeKey: string;
  storeUrl: string;
};

const stores: Store[] = [
  {
    key: 'buybrazil10',
    baseUrl: 'https://www.buybrazil10.com',
  },
];

const minScore = Number(process.env.SHOPIFY_CATALOG_MIN_SCORE ?? 0.62);
const delayMs = Math.max(Number(process.env.SHOPIFY_CATALOG_DELAY_MS ?? 500), 0);
const blockedDelayMs = Math.max(Number(process.env.SHOPIFY_CATALOG_BLOCK_DELAY_MS ?? 180000), 10000);
const maxAttempts = Math.max(Number(process.env.SHOPIFY_CATALOG_MAX_ATTEMPTS ?? 8), 1);
const supabasePageSize = 1000;

const stopWords = new Set([
  'a',
  'e',
  'o',
  'de',
  'do',
  'da',
  'dos',
  'das',
  'com',
  'sem',
  'para',
  'por',
  'em',
  'the',
  'and',
  'for',
  'with',
  'kit',
  'produto',
  'profissional',
  'professional',
  'cosmeticos',
  'cosmetics',
]);

const wait = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const decodeHtml = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#034;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const stripHtml = (value: string) =>
  decodeHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).slice(0, 4000);

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

const similarity = (left: string, right: string) => {
  const leftNorm = normalize(left);
  const rightNorm = normalize(right);

  if (!leftNorm || !rightNorm) return 0;
  if (leftNorm === rightNorm) return 1;
  if (leftNorm.includes(rightNorm) || rightNorm.includes(leftNorm)) return 0.94;

  const leftTokens = new Set(tokens(left));
  const rightTokens = new Set(tokens(right));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;

  return Math.max(intersection / Math.max(leftTokens.size, rightTokens.size, 1) - measurePenalty(left, right), 0);
};

const measures = (value: string) => {
  const found = new Set<string>();
  const normalized = normalize(value).replace(/\bfl\s+oz\b/g, 'floz');
  const pattern = /(\d+(?:[.,]\d+)?)\s*(ml|l|g|kg|caps?|capsulas?|floz|oz)\b/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(normalized))) {
    const amountText = match[1];
    const unit = match[2];
    if (!amountText || !unit) continue;
    const amount = Number(amountText.replace(',', '.'));
    if (!Number.isFinite(amount)) continue;

    if (unit === 'l') found.add(`ml:${Math.round(amount * 1000)}`);
    else if (unit === 'kg') found.add(`g:${Math.round(amount * 1000)}`);
    else if (unit === 'ml') found.add(`ml:${Math.round(amount)}`);
    else if (unit === 'g') found.add(`g:${Math.round(amount)}`);
    else if (unit.startsWith('cap')) found.add(`caps:${Math.round(amount)}`);
    else found.add(`oz:${amount.toFixed(1)}`);
  }

  return found;
};

const measurePenalty = (left: string, right: string) => {
  const leftMeasures = measures(left);
  const rightMeasures = measures(right);

  if (leftMeasures.size === 0 || rightMeasures.size === 0) return 0;
  return [...leftMeasures].some((measure) => rightMeasures.has(measure)) ? 0 : 0.18;
};

const imageUrl = (product: ShopifyCatalogProduct) => product.images?.find((image) => image.src)?.src ?? null;

const productUrl = (product: StoreProduct) => `${product.storeUrl}/products/${product.handle}`;

const loadCachedProducts = async () => {
  if (!supabaseAdmin) throw new Error('Supabase service role is not configured.');

  const products: CachedProduct[] = [];

  for (let from = 0; ; from += supabasePageSize) {
    const { data, error } = await supabaseAdmin
      .from('product_cache')
      .select('tiny_id,name,brand,category,image_url,raw_payload')
      .or('image_url.is.null,brand.is.null,category.is.null')
      .order('name', { ascending: true })
      .range(from, from + supabasePageSize - 1);

    if (error) throw error;

    products.push(...((data ?? []) as CachedProduct[]));
    if ((data?.length ?? 0) < supabasePageSize) break;
  }

  return products;
};

const loadStoreCatalog = async (store: Store) => {
  const products: StoreProduct[] = [];

  for (let page = 1; ; page += 1) {
    const url = `${store.baseUrl}/products.json?limit=250&page=${page}`;
    let response: Response | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
        },
      });

      if (response.ok) break;

      const blocked = response.status === 429 || response.status === 403;
      if (blocked && attempt < maxAttempts) {
        console.warn(`${store.key} bloqueou catalogo. Aguardando ${Math.round(blockedDelayMs / 1000)}s...`);
        await wait(blockedDelayMs);
        continue;
      }

      throw new Error(`${store.key} ${response.status} ${response.statusText}`);
    }

    if (!response?.ok) throw new Error(`${store.key} failed to load catalog`);

    const data = (await response.json()) as { products?: ShopifyCatalogProduct[] };
    const pageProducts = data.products ?? [];

    for (const product of pageProducts) {
      if (!product.title || !imageUrl(product)) continue;
      products.push({ ...product, storeKey: store.key, storeUrl: store.baseUrl });
    }

    console.log(`${store.key} pagina ${page} | produtos ${products.length}`);
    if (delayMs > 0) await wait(delayMs);
    if (pageProducts.length < 250) break;
  }

  return products;
};

const loadCatalog = async () => {
  const allProducts: StoreProduct[] = [];

  for (const store of stores) {
    allProducts.push(...(await loadStoreCatalog(store)));
  }

  return allProducts;
};

const bestMatch = (product: CachedProduct, catalog: StoreProduct[]) => {
  let best: { product: StoreProduct; score: number } | null = null;

  for (const catalogProduct of catalog) {
    const score = similarity(product.name, catalogProduct.title);
    if (!best || score > best.score) best = { product: catalogProduct, score };
  }

  return best && best.score >= minScore ? best : null;
};

const updateProduct = async (cached: CachedProduct, match: { product: StoreProduct; score: number }) => {
  if (!supabaseAdmin) throw new Error('Supabase service role is not configured.');

  const catalogProduct = match.product;
  const rawPayload = cached.raw_payload ?? {};
  const image = cached.image_url || imageUrl(catalogProduct);
  const brand = cached.brand || catalogProduct.vendor || null;
  const category = cached.category || catalogProduct.product_type || null;
  const bodyText = catalogProduct.body_html ? stripHtml(catalogProduct.body_html) : null;

  const { error } = await supabaseAdmin
    .from('product_cache')
    .update({
      image_url: image,
      brand,
      category,
      raw_payload: {
        ...rawPayload,
        shopify_catalog_store: catalogProduct.storeKey,
        shopify_catalog_product_id: catalogProduct.id,
        shopify_catalog_title: catalogProduct.title,
        shopify_catalog_url: productUrl(catalogProduct),
        shopify_catalog_image_url: imageUrl(catalogProduct),
        shopify_catalog_vendor: catalogProduct.vendor,
        shopify_catalog_type: catalogProduct.product_type,
        shopify_catalog_body_text: bodyText,
        shopify_catalog_match_score: match.score,
        shopify_catalog_synced_at: new Date().toISOString(),
      },
      synced_at: new Date().toISOString(),
    })
    .eq('tiny_id', cached.tiny_id);

  if (error) throw error;
};

const run = async () => {
  const [cachedProducts, catalog] = await Promise.all([loadCachedProducts(), loadCatalog()]);
  let matched = 0;
  let withImage = 0;
  let updated = 0;
  let skipped = 0;

  console.log(`Produtos no cache para cruzar: ${cachedProducts.length}`);
  console.log(`Produtos no catalogo Shopify: ${catalog.length}`);

  for (const product of cachedProducts) {
    const match = bestMatch(product, catalog);

    if (!match) {
      skipped += 1;
      continue;
    }

    matched += 1;
    if (!product.image_url && imageUrl(match.product)) withImage += 1;
    await updateProduct(product, match);
    updated += 1;

    if (updated % 50 === 0) {
      console.log(`Shopify catalog atualizados ${updated} | imagens ${withImage} | pulados ${skipped}`);
    }
  }

  console.log(JSON.stringify({ cachedProducts: cachedProducts.length, catalog: catalog.length, matched, updated, withImage, skipped }, null, 2));
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
