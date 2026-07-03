import { z } from 'zod';

import { sendCsv, sendSuccess } from '../api/response.js';
import { AppError } from '../lib/errors.js';
import { asyncHandler } from '../lib/async-handler.js';
import { productsCacheService } from '../services/supabase/products-cache.service.js';
import { tinyService } from '../services/tiny/tiny.service.js';
import { toCsv } from '../utils/csv.js';
import { paginate } from '../utils/pagination.js';

export const productsQuerySchema = z.object({
  search: z.string().max(120).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(5000).optional().default(5000),
  category: z.string().max(80).optional(),
  stock: z.enum(['all', 'low', 'out']).optional().default('all'),
  format: z.enum(['json', 'csv']).optional().default('json'),
});

export const productParamsSchema = z.object({
  id: z.string().min(1).max(80),
});

export const updateInternalProductSchema = z.object({
  internalNotes: z.string().max(1000).optional(),
  minimumStock: z.number().int().nonnegative().optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
});

export const productsController = {
  index: asyncHandler(async (request, response) => {
    const query = productsQuerySchema.parse(request.query);
    const hasCache = await productsCacheService.hasProducts();
    const products = hasCache
      ? await productsCacheService.list({
          search: query.search,
          category: query.category,
          stock: query.stock,
        })
      : await tinyService.listAllProducts({ search: query.search });
    const filtered = products.filter((product) => {
      if (query.category && product.category !== query.category) return false;
      if (query.stock === 'low') {
        return product.stock !== null && product.stock > 0 && product.stock <= product.minimumStock;
      }
      if (query.stock === 'out') return product.stock !== null && product.stock <= 0;
      return true;
    });

    if (query.format === 'csv') {
      sendCsv(response, 'produtos-belaways.csv', toCsv(filtered as unknown as Array<Record<string, unknown>>));
      return;
    }

    const paginated = paginate(filtered, query.page, query.pageSize);
    sendSuccess(response, paginated.items, 'ok', {
      page: paginated.page,
      pageSize: paginated.pageSize,
      total: paginated.total,
      totalPages: paginated.totalPages,
    });
  }),

  show: asyncHandler(async (request, response) => {
    const { id } = productParamsSchema.parse(request.params);
    const cachedProduct = await productsCacheService.get(id);

    if (!cachedProduct || !cachedProduct.imageUrl || cachedProduct.stock === null) {
      const payload = await tinyService.getProductWithPayload(id);
      if (payload.product) {
        await productsCacheService
          .upsertMany([
            {
              product: payload.product,
              rawPayload: payload.rawPayload,
              stockPayload: payload.stockPayload,
            },
          ])
          .catch(() => undefined);
        sendSuccess(response, payload.product);
        return;
      }
    }

    if (!cachedProduct) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
    }

    sendSuccess(response, cachedProduct);
  }),

  updateInternal: asyncHandler(async (request, response) => {
    productParamsSchema.parse(request.params);
    const payload = updateInternalProductSchema.parse(request.body);

    sendSuccess(response, {
      ...payload,
      updatedAt: new Date().toISOString(),
    });
  }),
};
