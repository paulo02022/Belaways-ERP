import { productsCacheService } from '../services/supabase/products-cache.service.js';
import { tinyService } from '../services/tiny/tiny.service.js';

const concurrency = Math.max(Number(process.env.DETAILS_SYNC_CONCURRENCY ?? 1), 1);
const delayMs = Math.max(Number(process.env.DETAILS_SYNC_DELAY_MS ?? 1200), 0);
const blockedDelayMs = Math.max(Number(process.env.DETAILS_SYNC_BLOCK_DELAY_MS ?? 120000), 10000);
const maxAttempts = Math.max(Number(process.env.DETAILS_SYNC_MAX_ATTEMPTS ?? 9999), 1);
const shardTotal = Math.max(Number(process.env.DETAILS_SYNC_SHARD_TOTAL ?? 1), 1);
const shardIndex = Math.min(Math.max(Number(process.env.DETAILS_SYNC_SHARD_INDEX ?? 0), 0), shardTotal - 1);

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

const needsDetails = (product: Awaited<ReturnType<typeof productsCacheService.list>>[number]) =>
  product.price <= 0 ||
  product.category === null ||
  product.brand === null ||
  product.ean === null ||
  product.ncm === null ||
  product.weightKg === null ||
  product.grossWeightKg === null ||
  !product.imageUrl ||
  !product.description;

const run = async () => {
  const startedAt = Date.now();
  const products = await productsCacheService.list();
  const pending = products.filter(needsDetails).filter((_, index) => index % shardTotal === shardIndex);

  console.log(`Produtos no cache: ${products.length}`);
  console.log(`Produtos pendentes de detalhes: ${pending.length}`);
  if (shardTotal > 1) console.log(`Shard: ${shardIndex + 1}/${shardTotal}`);

  let processed = 0;
  let updated = 0;
  let failures = 0;

  for (let index = 0; index < pending.length; index += concurrency) {
    const group = pending.slice(index, index + concurrency);
    const enriched = await Promise.all(
      group.map(async (summary) => {
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          try {
            const payload = await tinyService.getProductWithPayload(summary.id, {
              includeStock: false,
            });

            if (delayMs > 0) await wait(delayMs);
            if (!payload.product) return { product: summary };

            updated += 1;
            return {
              product: payload.product,
              rawPayload: payload.rawPayload,
              stockPayload: payload.stockPayload,
            };
          } catch (error) {
            if (isTinyRateLimit(error) && attempt < maxAttempts) {
              console.warn(`Tiny bloqueou detalhes. Aguardando ${Math.round(blockedDelayMs / 1000)}s...`);
              await wait(blockedDelayMs);
              continue;
            }

            failures += 1;
            console.warn(
              `Falha detalhes ${summary.id} - ${error instanceof Error ? error.message : String(error)}`,
            );
            return { product: summary };
          }
        }

        return { product: summary };
      }),
    );

    await productsCacheService.upsertMany(enriched);
    processed += group.length;

    if (processed % 25 === 0 || processed === pending.length) {
      console.log(
        `Detalhes ${processed}/${pending.length} | atualizados ${updated} | falhas ${failures} | ${Math.round(
          (Date.now() - startedAt) / 1000,
        )}s`,
      );
    }
  }

  console.log(
    JSON.stringify(
      {
        processed,
        updated,
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
