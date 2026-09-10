import { sendSuccess } from '../api/response.js';
import { asyncHandler } from '../lib/async-handler.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { productsCacheService } from '../services/supabase/products-cache.service.js';
import { tinyService } from '../services/tiny/tiny.service.js';

export const syncController = {
  products: asyncHandler(async (request, response) => {
    const incremental = request.query.mode === 'incremental';
    const deep = request.query.deep === 'true';

    if (incremental) {
      const lastSyncAt =
        (await productsCacheService.getLastSuccessfulRunAt()) ?? (await productsCacheService.getLastSyncAt());
      const since = lastSyncAt ? new Date(lastSyncAt) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      since.setMinutes(since.getMinutes() - 5);
      const unavailableSources: string[] = [];

      const created = await tinyService.listRecentlyCreatedProducts(since).catch((error: unknown) => {
        logger.warn({ error }, 'Unable to discover recently created Tiny products');
        throw new AppError(502, 'TINY_INCREMENTAL_SYNC_FAILED', 'Unable to query newly created products.');
      });
      const changed = await tinyService.listChangedProducts(since).catch((error: unknown) => {
        unavailableSources.push('changed');
        logger.warn({ error }, 'Tiny changed-products queue is unavailable');
        return [];
      });
      const stockUpdates = await tinyService.listStockUpdates(since).catch((error: unknown) => {
        unavailableSources.push('stock');
        logger.warn({ error }, 'Tiny stock-updates queue is unavailable');
        return [];
      });
      const catalogById = new Map([...created, ...changed].map((product) => [product.id, product]));
      const catalogProducts = [...catalogById.values()];
      if (stockUpdates.length > 0) {
        const stockPersisted = await productsCacheService.upsertStockUpdates(stockUpdates);
        if (!stockPersisted) {
          throw new AppError(503, 'PRODUCT_STOCK_SYNC_PERSIST_FAILED', 'Unable to persist stock updates.');
        }
      }
      const syncResult = await productsCacheService.sync(catalogProducts, request.user?.id ?? null);
      if (!syncResult.persisted) {
        throw new AppError(503, 'PRODUCT_SYNC_PERSIST_FAILED', 'Unable to persist product updates.');
      }
      const affectedIds = new Set([...catalogProducts, ...stockUpdates].map((product) => product.id));

      sendSuccess(response, {
        totalProducts: affectedIds.size,
        persisted: syncResult.persisted,
        runId: syncResult.runId,
        mode: 'incremental',
        sources: {
          created: created.length,
          changed: changed.length,
          stock: stockUpdates.length,
        },
        unavailableSources,
        syncedAt: new Date().toISOString(),
      });
      return;
    }

    const products = await tinyService.listAllProducts();

    if (!deep) {
      const syncResult = await productsCacheService.sync(products, request.user?.id ?? null);

      sendSuccess(response, {
        totalProducts: products.length,
        persisted: syncResult.persisted,
        runId: syncResult.runId,
        mode: 'full',
        deep: false,
      });
      return;
    }

    const enriched = [];
    for (const product of products) {
      const payload = await tinyService.getProductWithPayload(product.id);
      enriched.push({
        product: payload.product ?? product,
        rawPayload: payload.rawPayload,
        stockPayload: payload.stockPayload,
      });
    }

    const syncResult = await productsCacheService.sync(enriched, request.user?.id ?? null);

    sendSuccess(response, {
      totalProducts: products.length,
      persisted: syncResult.persisted,
      runId: syncResult.runId,
      mode: 'full',
      deep: true,
    });
  }),
};
