import { supabaseAdmin } from '../database/supabase.js';

type CachedProduct = {
  tiny_id: string;
  sku: string | null;
  ean: string | null;
  name: string;
  image_url: string | null;
  brand: string | null;
  category: string | null;
  price: number | string | null;
  promotional_price: number | string | null;
  status: string | null;
  raw_payload: Record<string, unknown> | null;
};

type CatalogProduct = {
  idProduct?: string;
  idCategory?: string;
  category?: string;
  nameProduct?: string;
  sellPrice?: string;
  price?: string;
  brand?: string;
  model?: string;
  reference?: string;
  availability?: string;
  urlImage?: string;
  urlProduct?: string;
};

type StoreProduct = {
  sourceUrl: string;
  id: string | null;
  name: string;
  imageUrl: string | null;
  url: string | null;
  brand: string | null;
  category: string | null;
  reference: string | null;
  price: number | null;
  sellPrice: number | null;
  availability: string | null;
  model: string | null;
};

const sitemapIndexUrl = 'https://www.belaways.com.br/sitemap.xml';
const concurrency = Math.max(Number(process.env.STOREFRONT_CATALOG_CONCURRENCY ?? 16), 1);
const maxPages = Math.max(Number(process.env.STOREFRONT_CATALOG_MAX_PAGES ?? 700), 1);
const minScore = Number(process.env.STOREFRONT_CATALOG_MIN_SCORE ?? 0.55);
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
  'the',
  'and',
  'kit',
  'produto',
  'profissional',
  'professional',
]);

const fetchText = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Belaways ERP Catalog Sync/1.0',
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

const asNumber = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const extractLocs = (xml: string) =>
  [...xml.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map((match) => decodeHtml(match[1] ?? ''))
    .filter(Boolean);

const readJsonArray = (source: string, start: number) => {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '[') {
      depth += 1;
    } else if (char === ']') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  return null;
};

const extractCatalogProducts = (html: string, sourceUrl: string): StoreProduct[] => {
  const products: StoreProduct[] = [];
  const marker = '"listProducts"';
  let searchFrom = 0;

  while (searchFrom < html.length) {
    const markerIndex = html.indexOf(marker, searchFrom);
    if (markerIndex === -1) break;

    const arrayStart = html.indexOf('[', markerIndex + marker.length);
    if (arrayStart === -1) break;

    const arrayText = readJsonArray(html, arrayStart);
    if (!arrayText) break;

    try {
      const parsed = JSON.parse(arrayText) as CatalogProduct[];

      for (const item of parsed) {
        const name = decodeHtml(item.nameProduct ?? '');
        const imageUrl = item.urlImage ? decodeHtml(item.urlImage) : null;

        if (!name || !imageUrl) continue;

        products.push({
          sourceUrl,
          id: item.idProduct ?? null,
          name,
          imageUrl,
          url: item.urlProduct ? decodeHtml(item.urlProduct) : null,
          brand: item.brand ? decodeHtml(item.brand) : null,
          category: item.category ? decodeHtml(item.category) : null,
          reference: item.reference ? decodeHtml(item.reference) : null,
          price: asNumber(item.price),
          sellPrice: asNumber(item.sellPrice),
          availability: item.availability ?? null,
          model: item.model ? decodeHtml(item.model) : null,
        });
      }
    } catch (error) {
      console.warn(`Falha ao ler catalogo em ${sourceUrl}: ${error instanceof Error ? error.message : String(error)}`);
    }

    searchFrom = arrayStart + arrayText.length;
  }

  return products;
};

const isCatalogPaginationUrl = (url: URL) => {
  if (url.hostname !== 'www.belaways.com.br') return false;
  if (url.pathname === '/loja/catalogo.php' && url.searchParams.has('categoria')) return true;

  if (url.pathname === '/loja/busca.php') {
    return (
      url.searchParams.get('loja') === '1300980' &&
      !url.searchParams.has('palavra_busca') &&
      (url.searchParams.has('somente_oferta') ||
        url.searchParams.has('somente_destaque') ||
        url.searchParams.has('somente_lancamento'))
    );
  }

  return false;
};

const extractCatalogLinks = (html: string, sourceUrl: string) => {
  const links = new Set<string>();

  for (const match of html.matchAll(/href=["']([^"']+)["']/gi)) {
    try {
      const url = new URL(decodeHtml(match[1] ?? ''), sourceUrl);
      url.hash = '';

      if (isCatalogPaginationUrl(url)) links.add(url.toString());
    } catch {
      continue;
    }
  }

  return links;
};

const loadSitemapUrls = async () => {
  const sitemapIndex = await fetchText(sitemapIndexUrl);
  const sitemapUrls = extractLocs(sitemapIndex).filter((url) => url.includes('/sitemaps/'));
  const urls = new Set<string>();

  for (const sitemapUrl of sitemapUrls) {
    const sitemap = await fetchText(sitemapUrl);
    for (const url of extractLocs(sitemap)) {
      if (url.includes('belaways.com.br/')) urls.add(url);
    }
  }

  urls.add('https://www.belaways.com.br/');
  return [...urls];
};

const crawlCatalogProducts = async () => {
  const queue = await loadSitemapUrls();
  const seenPages = new Set<string>();
  const productsByKey = new Map<string, StoreProduct>();
  let processedPages = 0;

  while (queue.length > 0 && processedPages < maxPages) {
    const group: string[] = [];

    while (queue.length > 0 && group.length < concurrency) {
      const url = queue.shift();
      if (!url || seenPages.has(url)) continue;

      seenPages.add(url);
      group.push(url);
    }

    if (group.length === 0) break;

    const pages = await Promise.all(
      group.map(async (url) => {
        try {
          return { url, html: await fetchText(url) };
        } catch (error) {
          console.warn(`Falha pagina ${url} - ${error instanceof Error ? error.message : String(error)}`);
          return null;
        }
      }),
    );

    for (const page of pages) {
      if (!page) continue;

      processedPages += 1;

      for (const product of extractCatalogProducts(page.html, page.url)) {
        const key = product.url || product.id || product.name;
        productsByKey.set(key, product);
      }

      for (const link of extractCatalogLinks(page.html, page.url)) {
        if (!seenPages.has(link) && !queue.includes(link)) queue.push(link);
      }
    }

    console.log(`Catalogo paginas ${processedPages}/${maxPages} | fila ${queue.length} | produtos ${productsByKey.size}`);
  }

  return { pages: processedPages, products: [...productsByKey.values()] };
};

const loadCachedProducts = async () => {
  if (!supabaseAdmin) throw new Error('Supabase service role is not configured.');

  const products: CachedProduct[] = [];

  for (let from = 0; ; from += supabasePageSize) {
    const { data, error } = await supabaseAdmin
      .from('product_cache')
      .select('tiny_id,sku,ean,name,image_url,brand,category,price,promotional_price,status,raw_payload')
      .order('name', { ascending: true })
      .range(from, from + supabasePageSize - 1);

    if (error) throw error;

    products.push(...((data ?? []) as CachedProduct[]));
    if ((data?.length ?? 0) < supabasePageSize) break;
  }

  return products;
};

const buildCodeIndex = (products: CachedProduct[]) => {
  const index = new Map<string, CachedProduct>();

  for (const product of products) {
    for (const value of [product.sku, product.ean]) {
      const code = normalizeCode(value);
      if (code) index.set(code, product);
    }
  }

  return index;
};

const bestMatch = (storeProduct: StoreProduct, cachedProducts: CachedProduct[], codeIndex: Map<string, CachedProduct>) => {
  const reference = normalizeCode(storeProduct.reference);
  if (reference && codeIndex.has(reference)) {
    return { product: codeIndex.get(reference)!, score: 1, reason: 'reference' };
  }

  let best: { product: CachedProduct; score: number; reason: string } | null = null;

  for (const product of cachedProducts) {
    const score = similarity(storeProduct.name, product.name);
    if (!best || score > best.score) best = { product, score, reason: 'name' };
  }

  return best && best.score >= minScore ? best : null;
};

const run = async () => {
  if (!supabaseAdmin) throw new Error('Supabase service role is not configured.');

  const [cachedProducts, catalog] = await Promise.all([loadCachedProducts(), crawlCatalogProducts()]);
  const codeIndex = buildCodeIndex(cachedProducts);
  const now = new Date().toISOString();
  let matched = 0;
  let byReference = 0;
  let byName = 0;
  let updated = 0;
  let imagesAdded = 0;
  let skipped = 0;

  console.log(`Produtos no cache: ${cachedProducts.length}`);
  console.log(`Produtos achados no catalogo: ${catalog.products.length}`);

  for (const storeProduct of catalog.products) {
    const match = bestMatch(storeProduct, cachedProducts, codeIndex);

    if (!match) {
      skipped += 1;
      continue;
    }

    matched += 1;
    if (match.reason === 'reference') byReference += 1;
    if (match.reason === 'name') byName += 1;

    const currentRawPayload = match.product.raw_payload ?? {};
    const imageWasMissing = !match.product.image_url && Boolean(storeProduct.imageUrl);
    const nextImageUrl = match.product.image_url || storeProduct.imageUrl;
    const nextBrand = match.product.brand || storeProduct.brand;
    const nextCategory = match.product.category || storeProduct.category;
    const nextPrice = match.product.price ?? storeProduct.sellPrice ?? storeProduct.price;
    const nextPromotionalPrice =
      match.product.promotional_price ??
      (storeProduct.sellPrice !== null && storeProduct.price !== null && storeProduct.sellPrice < storeProduct.price
        ? storeProduct.sellPrice
        : null);

    const { error } = await supabaseAdmin
      .from('product_cache')
      .update({
        image_url: nextImageUrl,
        brand: nextBrand,
        category: nextCategory,
        price: nextPrice,
        promotional_price: nextPromotionalPrice,
        status: match.product.status || storeProduct.availability,
        raw_payload: {
          ...currentRawPayload,
          storefront_catalog_url: storeProduct.url,
          storefront_catalog_name: storeProduct.name,
          storefront_catalog_id: storeProduct.id,
          storefront_catalog_reference: storeProduct.reference,
          storefront_catalog_brand: storeProduct.brand,
          storefront_catalog_category: storeProduct.category,
          storefront_catalog_model: storeProduct.model,
          storefront_catalog_price: storeProduct.price,
          storefront_catalog_sell_price: storeProduct.sellPrice,
          storefront_catalog_availability: storeProduct.availability,
          storefront_catalog_match_score: match.score,
          storefront_catalog_match_reason: match.reason,
        },
        synced_at: now,
      })
      .eq('tiny_id', match.product.tiny_id);

    if (error) throw error;

    updated += 1;
    if (imageWasMissing) imagesAdded += 1;

    match.product.image_url = nextImageUrl;
    match.product.brand = nextBrand;
    match.product.category = nextCategory;
    match.product.price = nextPrice;
    match.product.promotional_price = nextPromotionalPrice;
    match.product.status = match.product.status || storeProduct.availability;
    match.product.raw_payload = {
      ...currentRawPayload,
      storefront_catalog_url: storeProduct.url,
      storefront_catalog_name: storeProduct.name,
      storefront_catalog_id: storeProduct.id,
      storefront_catalog_reference: storeProduct.reference,
      storefront_catalog_brand: storeProduct.brand,
      storefront_catalog_category: storeProduct.category,
      storefront_catalog_model: storeProduct.model,
      storefront_catalog_price: storeProduct.price,
      storefront_catalog_sell_price: storeProduct.sellPrice,
      storefront_catalog_availability: storeProduct.availability,
      storefront_catalog_match_score: match.score,
      storefront_catalog_match_reason: match.reason,
    };
  }

  console.log(
    JSON.stringify(
      {
        pages: catalog.pages,
        catalogProducts: catalog.products.length,
        cachedProducts: cachedProducts.length,
        matched,
        byReference,
        byName,
        updated,
        imagesAdded,
        skipped,
      },
      null,
      2,
    ),
  );
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
