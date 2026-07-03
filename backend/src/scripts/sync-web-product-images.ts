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

type SearchResult = {
  title?: string;
  image?: string;
  url?: string;
  source?: string;
  width?: number;
  height?: number;
};

type Match = {
  result: SearchResult;
  score: number;
  query: string;
};

const concurrency = Math.max(Number(process.env.WEB_IMAGE_SYNC_CONCURRENCY ?? 4), 1);
const limit = Math.max(Number(process.env.WEB_IMAGE_SYNC_LIMIT ?? 0), 0);
const delayMs = Math.max(Number(process.env.WEB_IMAGE_SYNC_DELAY_MS ?? 800), 0);
const blockedDelayMs = Math.max(Number(process.env.WEB_IMAGE_SYNC_BLOCK_DELAY_MS ?? 120000), 10000);
const maxAttempts = Math.max(Number(process.env.WEB_IMAGE_SYNC_MAX_ATTEMPTS ?? 8), 1);
const minScore = Number(process.env.WEB_IMAGE_SYNC_MIN_SCORE ?? 0.52);
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
  'um',
  'uma',
  'the',
  'and',
  'for',
  'with',
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

const normalize = (value: string) =>
  decodeHtml(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeCode = (value: string | null | undefined) =>
  String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const isBarcodeLike = (value: string) => /^\d{8,14}$/.test(value);

const tokens = (value: string) =>
  normalize(value)
    .split(' ')
    .filter((token) => token.length > 1 && !stopWords.has(token));

const tokenSimilarity = (left: string, right: string) => {
  const leftTokens = new Set(tokens(left));
  const rightTokens = new Set(tokens(right));

  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return intersection / Math.max(leftTokens.size, 1);
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

const measurePenalty = (productName: string, candidate: string) => {
  const productMeasures = measures(productName);
  const candidateMeasures = measures(candidate);

  if (productMeasures.size === 0 || candidateMeasures.size === 0) return 0;
  return [...productMeasures].some((measure) => candidateMeasures.has(measure)) ? 0 : 0.18;
};

const isUsefulImage = (result: SearchResult) => {
  const image = result.image ?? '';
  const title = normalize(result.title ?? '');
  const url = normalize(result.url ?? '');

  if (!image.startsWith('http')) return false;
  if (title.includes('logo') || title.includes('favicon')) return false;
  if (url.includes('sem resultados') || url.includes('no result')) return false;
  if (image.includes('favicon') || image.includes('logo')) return false;
  if (image.includes('banner') || image.includes('header') || image.includes('cabecalho')) return false;
  if (result.width && result.width < 120) return false;
  if (result.height && result.height < 120) return false;

  return true;
};

const scoreResult = (product: CachedProduct, result: SearchResult) => {
  if (!isUsefulImage(result)) return 0;

  const title = result.title ?? '';
  const url = result.url ?? '';
  const haystack = `${title} ${url}`;
  const nameScore = tokenSimilarity(product.name, haystack);
  const brandScore = product.brand ? tokenSimilarity(product.brand, haystack) : 0;
  const codes = [normalizeCode(product.ean), normalizeCode(product.sku)].filter(Boolean);
  const exactCode = codes.some((code) => isBarcodeLike(code) && haystack.includes(code));

  let score = nameScore;
  if (brandScore > 0) score += 0.15;
  if (exactCode) score += 0.35;
  if (normalize(haystack).includes('kit') !== normalize(product.name).includes('kit')) score -= 0.08;
  score -= measurePenalty(product.name, haystack);

  return Math.max(score, 0);
};

const buildQuery = (product: CachedProduct) => {
  const codes = [normalizeCode(product.ean), normalizeCode(product.sku)].filter((code) => isBarcodeLike(code));
  const code = codes[0];
  const parts = [product.name];

  if (product.brand && !normalize(product.name).includes(normalize(product.brand))) parts.push(product.brand);
  if (code) parts.push(code);

  return parts.join(' ').replace(/\s+/g, ' ').trim();
};

const fetchText = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
    },
  });

  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
};

const searchImages = async (query: string): Promise<SearchResult[]> => {
  const encodedQuery = encodeURIComponent(query);
  const page = await fetchText(`https://duckduckgo.com/?q=${encodedQuery}&iax=images&ia=images`);
  const vqd = page.match(/vqd=([\d-]+)&/)?.[1] ?? page.match(/vqd["']?\s*[:=]\s*["']?([\d-]+)/)?.[1];

  if (!vqd) return [];

  const response = await fetch(`https://duckduckgo.com/i.js?l=br-pt&o=json&q=${encodedQuery}&vqd=${vqd}&f=,,,&p=1`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
      Referer: 'https://duckduckgo.com/',
    },
  });

  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

  const data = (await response.json()) as { results?: SearchResult[] };
  return data.results ?? [];
};

const findBestImage = async (product: CachedProduct): Promise<Match | null> => {
  const query = buildQuery(product);
  let results: SearchResult[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      results = await searchImages(query);
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const blocked = message.includes('403') || message.includes('429');

      if (blocked && attempt < maxAttempts) {
        console.warn(`Busca web bloqueada. Aguardando ${Math.round(blockedDelayMs / 1000)}s...`);
        await wait(blockedDelayMs);
        continue;
      }

      throw error;
    }
  }

  let best: Match | null = null;

  for (const result of results.slice(0, 20)) {
    const score = scoreResult(product, result);
    if (!best || score > best.score) best = { result, score, query };
  }

  return best && best.score >= minScore ? best : null;
};

const loadProducts = async () => {
  if (!supabaseAdmin) throw new Error('Supabase service role is not configured.');

  const products: CachedProduct[] = [];

  for (let from = 0; ; from += supabasePageSize) {
    const { data, error } = await supabaseAdmin
      .from('product_cache')
      .select('tiny_id,sku,ean,name,brand,category,image_url,raw_payload')
      .is('image_url', null)
      .order('name', { ascending: true })
      .range(from, from + supabasePageSize - 1);

    if (error) throw error;

    products.push(...((data ?? []) as CachedProduct[]));
    if ((data?.length ?? 0) < supabasePageSize) break;
  }

  return limit > 0 ? products.slice(0, limit) : products;
};

const updateProduct = async (product: CachedProduct, match: Match) => {
  if (!supabaseAdmin) throw new Error('Supabase service role is not configured.');

  const rawPayload = product.raw_payload ?? {};
  const { error } = await supabaseAdmin
    .from('product_cache')
    .update({
      image_url: match.result.image,
      raw_payload: {
        ...rawPayload,
        web_image_query: match.query,
        web_image_title: match.result.title,
        web_image_url: match.result.url,
        web_image_source: match.result.source,
        web_image_score: match.score,
        web_image_synced_at: new Date().toISOString(),
      },
      synced_at: new Date().toISOString(),
    })
    .eq('tiny_id', product.tiny_id)
    .is('image_url', null);

  if (error) throw error;
};

const run = async () => {
  const products = await loadProducts();
  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let failures = 0;
  let cursor = 0;

  console.log(`Produtos sem imagem para busca web: ${products.length}`);

  const worker = async () => {
    while (cursor < products.length) {
      const product = products[cursor];
      cursor += 1;
      if (!product) continue;

      try {
        const match = await findBestImage(product);

        if (match) {
          await updateProduct(product, match);
          updated += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        failures += 1;
        console.warn(`Falha web image ${product.tiny_id} - ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        processed += 1;
        if (delayMs > 0) await wait(delayMs);

        if (processed % 25 === 0 || processed === products.length) {
          console.log(`Web imagens ${processed}/${products.length} | atualizadas ${updated} | puladas ${skipped} | falhas ${failures}`);
        }
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log(JSON.stringify({ processed, updated, skipped, failures }, null, 2));
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
