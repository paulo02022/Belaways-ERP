import { z } from 'zod';

import { sendSuccess } from '../api/response.js';
import { asyncHandler } from '../lib/async-handler.js';
import { dashboardService } from '../services/insights/dashboard.service.js';
import { productsCacheService } from '../services/supabase/products-cache.service.js';
import { tinyService } from '../services/tiny/tiny.service.js';

export const dashboardQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month']).optional().default('week'),
});

export const dashboardController = {
  overview: asyncHandler(async (_request, response) => {
    const hasProductCache = await productsCacheService.hasProducts();
    const [products, orders] = await Promise.all([
      hasProductCache ? productsCacheService.list() : tinyService.listAllProducts(),
      tinyService.listOrders({ page: 1 }),
    ]);

    sendSuccess(response, dashboardService.build(products, orders, 'online'));
  }),
};
