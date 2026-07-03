import { z } from 'zod';

import { sendSuccess } from '../api/response.js';
import { asyncHandler } from '../lib/async-handler.js';
import { dashboardService } from '../services/insights/dashboard.service.js';
import { tinyService } from '../services/tiny/tiny.service.js';

export const dashboardQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month']).optional().default('week'),
});

export const dashboardController = {
  overview: asyncHandler(async (_request, response) => {
    const [products, orders] = await Promise.all([
      tinyService.listProducts({ page: 1 }),
      tinyService.listOrders({ page: 1 }),
    ]);

    sendSuccess(response, dashboardService.build(products, orders, 'online'));
  }),
};
