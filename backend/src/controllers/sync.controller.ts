import { sendSuccess } from '../api/response.js';
import { asyncHandler } from '../lib/async-handler.js';
import { productsCacheService } from '../services/supabase/products-cache.service.js';
import { tinyService } from '../services/tiny/tiny.service.js';

export const syncController = {
  products: asyncHandler(async (request, response) => {
    const deep = request.query.deep === 'true';
    const products = await tinyService.listAllProducts();

    if (!deep) {
      const syncResult = await productsCacheService.sync(products, request.user?.id ?? null);

      sendSuccess(response, {
        totalProducts: products.length,
        persisted: syncResult.persisted,
        runId: syncResult.runId,
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
      deep: true,
    });
  }),
};
