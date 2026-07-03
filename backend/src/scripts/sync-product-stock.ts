import { hasSupabaseConfig, supabaseAdmin } from '../database/supabase.js';
import { productsCacheService } from '../services/supabase/products-cache.service.js';
import { tinyService } from '../services/tiny/tiny.service.js';

const concurrency = Math.max(Number(process.env.STOCK_SYNC_CONCURRENCY ?? 1), 1);
const delayMs = Math.max(Number(process.env.STOCK_SYNC_DELAY_MS ?? 900), 0);
const blockedDelayMs = Math.max(Number(process.env.STOCK_SYNC_BLOCK_DELAY_MS ?? 120000), 10000);
const maxAttempts = Math.max(Number(process.env.STOCK_SYNC_MAX_ATTEMPTS ?? 9999), 1);
const shardTotal = Math.max(Number(process.env.STOCK_SYNC_SHARD_TOTAL ?? 1), 1);
const shardIndex = Math.min(Math.max(Number(process.env.STOCK_SYNC_SHARD_INDEX ?? 0), 0), shardTotal - 1);

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

const asOptionalNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const run = async () => {
  const client = supabaseAdmin;
  if (!hasSupabaseConfig || !client) {
    throw new Error('Supabase service role is not configured.');
  }

  const startedAt = Date.now();
  const products = await productsCacheService.list();
  const pending = products
    .filter((product) => product.stock === null || product.reservedStock === null)
    .filter((_, index) => index % shardTotal === shardIndex);

  console.log(`Produtos no cache: ${products.length}`);
  console.log(`Produtos pendentes de estoque: ${pending.length}`);
  if (shardTotal > 1) console.log(`Shard: ${shardIndex + 1}/${shardTotal}`);

  let processed = 0;
  let updated = 0;
  let withStock = 0;
  let failures = 0;

  for (let index = 0; index < pending.length; index += concurrency) {
    const group = pending.slice(index, index + concurrency);

    await Promise.all(
      group.map(async (product) => {
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          try {
            const stock = await tinyService.getProductStock(product.id);
            const stockQuantity = asOptionalNumber(stock?.saldo);
            const reservedStock = asOptionalNumber(stock?.saldoReservado);

            const { error } = await client
              .from('product_cache')
              .update({
                stock_quantity: stockQuantity,
                reserved_stock: reservedStock,
                stock_payload: stock ?? {},
                synced_at: new Date().toISOString(),
              })
              .eq('tiny_id', product.id);

            if (error) throw error;

            updated += 1;
            if (stockQuantity !== null) withStock += 1;
            if (delayMs > 0) await wait(delayMs);
            return;
          } catch (error) {
            if (isTinyRateLimit(error) && attempt < maxAttempts) {
              console.warn(`Tiny bloqueou estoque. Aguardando ${Math.round(blockedDelayMs / 1000)}s...`);
              await wait(blockedDelayMs);
              continue;
            }

            failures += 1;
            console.warn(
              `Falha estoque ${product.id} - ${error instanceof Error ? error.message : String(error)}`,
            );
            return;
          }
        }
      }),
    );

    processed += group.length;
    if (processed % 25 === 0 || processed === pending.length) {
      console.log(
        `Estoques ${processed}/${pending.length} | atualizados ${updated} | com saldo ${withStock} | falhas ${failures} | ${Math.round(
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
