import { productsCacheService } from '../services/supabase/products-cache.service.js';
import { tinyService } from '../services/tiny/tiny.service.js';
import type { Product } from '../types/domain.js';

const concurrency = Math.max(Number(process.env.PRODUCT_SYNC_CONCURRENCY ?? 1), 1);
const batchSize = Math.max(Number(process.env.PRODUCT_SYNC_BATCH_SIZE ?? 25), 1);
const delayMs = Math.max(Number(process.env.PRODUCT_SYNC_DELAY_MS ?? 1500), 0);
const blockedDelayMs = Math.max(Number(process.env.PRODUCT_SYNC_BLOCK_DELAY_MS ?? 180000), 10000);
const maxAttempts = Math.max(Number(process.env.PRODUCT_SYNC_MAX_ATTEMPTS ?? 4), 1);
const mode = process.env.PRODUCT_SYNC_MODE === 'details' ? 'details' : 'full';
const source = process.env.PRODUCT_SYNC_SOURCE === 'cache' ? 'cache' : 'tiny';
const shardTotal = Math.max(Number(process.env.PRODUCT_SYNC_SHARD_TOTAL ?? 1), 1);
const shardIndex = Math.min(Math.max(Number(process.env.PRODUCT_SYNC_SHARD_INDEX ?? 0), 0), shardTotal - 1);

const wait = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const isTinyRateLimit = (error: unknown) =>
  error instanceof Error &&
  error.message
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .includes('excedido o numero de acessos');

const isRich = (product: {
  imageUrl: string | null;
  stock: number | null;
  brand: string | null;
  ncm: string | null;
  description: string | null;
}) => Boolean(product.imageUrl || product.stock !== null || product.brand || product.ncm || product.description);

const needsSync = (product: Product) => {
  if (mode === 'details') return !isRich(product);

  return (
    product.stock === null ||
    product.reservedStock === null ||
    product.price <= 0 ||
    product.costPrice === null ||
    product.category === null ||
    product.brand === null ||
    product.ean === null ||
    product.ncm === null ||
    product.weightKg === null ||
    !product.imageUrl
  );
};

const run = async () => {
  const startedAt = Date.now();
  let summaries: Product[];

  if (source === 'cache') {
    console.log('Carregando lista de produtos do cache...');
    summaries = await productsCacheService.list();
  } else {
    console.log('Carregando lista de produtos do Tiny...');
    summaries = await tinyService.listAllProducts();
  }

  console.log(`Produtos encontrados: ${summaries.length}`);
  console.log(`Modo de sincronizacao: ${mode}`);
  console.log(`Fonte da lista: ${source}`);
  if (shardTotal > 1) console.log(`Shard: ${shardIndex + 1}/${shardTotal}`);

  if (source === 'tiny') {
    await productsCacheService.insertMissingSummaries(summaries);
    console.log('Resumo inicial salvo no Supabase.');
  }

  const cached = source === 'cache' ? summaries : await productsCacheService.list();
  const richIds = new Set(cached.filter((product) => !needsSync(product)).map((product) => product.id));
  const pending = summaries
    .filter((product) => !richIds.has(product.id))
    .filter((_, index) => index % shardTotal === shardIndex);
  console.log(`Produtos pendentes de enriquecimento: ${pending.length}`);

  let processed = 0;
  let withImage = 0;
  let withStock = 0;
  let failures = 0;

  for (let index = 0; index < pending.length; index += concurrency) {
    const group = pending.slice(index, index + concurrency);
    const enriched = await Promise.all(
      group.map(async (summary) => {
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          try {
            const payload = await tinyService.getProductWithPayload(summary.id, {
              includeStock: mode !== 'details',
            });
            const product = payload.product ?? summary;
            if (product.imageUrl) withImage += 1;
            if (product.stock !== null) withStock += 1;
            if (delayMs > 0) await wait(delayMs);

            return {
              product,
              rawPayload: payload.rawPayload,
              stockPayload: payload.stockPayload,
            };
          } catch (error) {
            if (isTinyRateLimit(error) && attempt < maxAttempts) {
              console.warn(`Tiny bloqueou a API. Aguardando ${Math.round(blockedDelayMs / 1000)}s...`);
              await wait(blockedDelayMs);
              continue;
            }

            failures += 1;
            console.warn(
              `Falha ao enriquecer ${summary.id} - ${error instanceof Error ? error.message : String(error)}`,
            );
            return { product: summary };
          }
        }

        return { product: summary };
      }),
    );

    await productsCacheService.upsertMany(enriched);
    processed += group.length;

    if (processed % batchSize === 0 || processed === pending.length) {
      const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
      console.log(
        `Sincronizados ${processed}/${pending.length} | imagens ${withImage} | estoque ${withStock} | falhas ${failures} | ${elapsedSeconds}s`,
      );
    }
  }

  console.log(
    JSON.stringify(
      {
        total: summaries.length,
        withImage,
        withStock,
        failures,
        elapsedSeconds: Math.round((Date.now() - startedAt) / 1000),
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
