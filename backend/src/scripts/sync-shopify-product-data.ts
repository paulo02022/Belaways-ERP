import { supabaseAdmin } from '../database/supabase.js';

type CachedProduct = {
  tiny_id: string;
  sku: string | null;
  ean: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  image_url: string | null;
  raw_payload: Record<string, unknown> | null;
};

type ShopifyProduct = {
  available?: boolean;
  body?: string;
  handle?: string;
  id?: number;
  image?: string;
  title?: string;
  type?: string;
  url?: string;
  vendor?: string;
  featured_image?: {
    alt?: string;
    url?: string;
    width?: number;
    height?: number;
  };
};

type ShopifySuggestResponse = {
  resources?: {
    results?: {
      products?: ShopifyProduct[];
    };
  };
};

const stores = [
  {
    key: 'buybrazil10',
    baseUrl: 'https://www.buybrazil10.com',
  },
];

const concurrency = Math.max(Number(process.env.SHOPIFY_SYNC_CONCURRENCY ?? 8), 1);
const limit = Math.max(Number(process.env.SHOPIFY_SYNC_LIMIT ?? 0), 0);
const delayMs = Math.max(Number(process.env.SHOPIFY_SYNC_DELAY_MS ?? 250), 0);
const blockedDelayMs = Math.max(Number(process.env.SHOPIFY_SYNC_BLOCK_DELAY_MS ?? 120000), 10000);
const maxAttempts = Math.max(Number(process.env.SHOPIFY_SYNC_MAX_ATTEMPTS ?? 8), 1);
const minScore = Number(process.env.SHOPIFY_SYNC_MIN_SCORE ?? 0.62);
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
  const leftTokens = new Set(tokens(left));
  const rightTokens = new Set(tokens(right));

  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  if (normalize(left) === normalize(right)) return 1;

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

const productImage = (product: ShopifyProduct) => product.featured_image?.url || product.image || null;

const loadProducts = async () => {
  if (!supabaseAdmin) throw new Error('Supabase service role is not configured.');

  const products: CachedProduct[] = [];

  for (let from = 0; ; from += supabasePageSize) {
    const { data, error } = await supabaseAdmin
      .from('product_cache')
      .select('tiny_id,sku,ean,name,brand,category,image_url,raw_payload')
      .or('image_url.is.null,brand.is.null,category.is.null')
      .is('raw_payload->>shopify_url', null)
      .order('name', { ascending: true })
      .range(from, from + supabasePageSize - 1);

    if (error) throw error;

    products.push(...((data ?? []) as CachedProduct[]));
    if ((data?.length ?? 0) < supabasePageSize) break;
  }

  return limit > 0 ? products.slice(0, limit) : products;
};

const searchStore = async (baseUrl: string, query: string) => {
  const url = `${baseUrl}/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=5`;
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
    },
  });

  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

  const data = (await response.json()) as ShopifySuggestResponse;
  return data.resources?.results?.products ?? [];
};

const findBest = async (product: CachedProduct) => {
  let best:
    | {
        storeKey: string;
        storeUrl: string;
        product: ShopifyProduct;
        score: number;
      }
    | null = null;

  for (const store of stores) {
    let results: ShopifyProduct[] = [];

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        results = await searchStore(store.baseUrl, product.name);
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const blocked = message.includes('429') || message.includes('403');

        if (blocked && attempt < maxAttempts) {
          console.warn(`Shopify bloqueou busca. Aguardando ${Math.round(blockedDelayMs / 1000)}s...`);
          await wait(blockedDelayMs);
          continue;
        }

        throw error;
      }
    }

    for (const result of results) {
      const title = result.title ?? '';
      const score = similarity(product.name, title);
      const image = productImage(result);

      if (!title || !image) continue;
      if (!best || score > best.score) {
        best = {
          storeKey: store.key,
          storeUrl: store.baseUrl,
          product: result,
          score,
        };
      }
    }
  }

  return best && best.score >= minScore ? best : null;
};

const updateProduct = async (
  cached: CachedProduct,
  match: {
    storeKey: string;
    storeUrl: string;
    product: ShopifyProduct;
    score: number;
  },
) => {
  if (!supabaseAdmin) throw new Error('Supabase service role is not configured.');

  const shopifyProduct = match.product;
  const image = cached.image_url || productImage(shopifyProduct);
  const brand = cached.brand || shopifyProduct.vendor || null;
  const category = cached.category || shopifyProduct.type || null;
  const bodyText = shopifyProduct.body ? stripHtml(shopifyProduct.body) : null;
  const rawPayload = cached.raw_payload ?? {};
  const productUrl = shopifyProduct.url ? new URL(shopifyProduct.url, match.storeUrl).toString() : null;

  const { error } = await supabaseAdmin
    .from('product_cache')
    .update({
      image_url: image,
      brand,
      category,
      raw_payload: {
        ...rawPayload,
        shopify_store: match.storeKey,
        shopify_product_id: shopifyProduct.id,
        shopify_title: shopifyProduct.title,
        shopify_url: productUrl,
        shopify_image_url: productImage(shopifyProduct),
        shopify_vendor: shopifyProduct.vendor,
        shopify_type: shopifyProduct.type,
        shopify_available: shopifyProduct.available,
        shopify_body_text: bodyText,
        shopify_match_score: match.score,
        shopify_synced_at: new Date().toISOString(),
      },
      synced_at: new Date().toISOString(),
    })
    .eq('tiny_id', cached.tiny_id);

  if (error) throw error;
};

const run = async () => {
  const products = await loadProducts();
  let processed = 0;
  let updated = 0;
  let withImage = 0;
  let skipped = 0;
  let failures = 0;
  let cursor = 0;

  console.log(`Produtos para enriquecer via Shopify: ${products.length}`);

  const worker = async () => {
    while (cursor < products.length) {
      const product = products[cursor];
      cursor += 1;
      if (!product) continue;

      try {
        const match = await findBest(product);

        if (match) {
          const imageWasMissing = !product.image_url && Boolean(productImage(match.product));
          await updateProduct(product, match);
          updated += 1;
          if (imageWasMissing) withImage += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        failures += 1;
        console.warn(`Falha Shopify ${product.tiny_id} - ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        processed += 1;
        if (delayMs > 0) await wait(delayMs);

        if (processed % 25 === 0 || processed === products.length) {
          console.log(
            `Shopify ${processed}/${products.length} | atualizados ${updated} | imagens ${withImage} | pulados ${skipped} | falhas ${failures}`,
          );
        }
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log(JSON.stringify({ processed, updated, withImage, skipped, failures }, null, 2));
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
