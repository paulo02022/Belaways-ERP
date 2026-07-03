import { z } from 'zod';

import { sendCsv, sendSuccess } from '../api/response.js';
import { asyncHandler } from '../lib/async-handler.js';
import { alertsService } from '../services/insights/alerts.service.js';
import { productsCacheService } from '../services/supabase/products-cache.service.js';
import { tinyService } from '../services/tiny/tiny.service.js';
import { toCsv } from '../utils/csv.js';

export const alertsQuerySchema = z.object({
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['open', 'acknowledged', 'resolved']).optional(),
  format: z.enum(['json', 'csv']).optional().default('json'),
});

export const alertParamsSchema = z.object({
  id: z.string().min(1).max(120),
});

export const updateAlertSchema = z.object({
  status: z.enum(['acknowledged', 'resolved']),
});

export const alertsController = {
  index: asyncHandler(async (request, response) => {
    const query = alertsQuerySchema.parse(request.query);
    const hasProductCache = await productsCacheService.hasProducts();
    const [products, orders] = await Promise.all([
      hasProductCache ? productsCacheService.list() : tinyService.listAllProducts(),
      tinyService.listOrders({ page: 1 }),
    ]);
    const alerts = alertsService.generate(products, orders).filter((alert) => {
      if (query.priority && alert.priority !== query.priority) return false;
      if (query.status && alert.status !== query.status) return false;
      return true;
    });

    if (query.format === 'csv') {
      sendCsv(response, 'alertas-belaways.csv', toCsv(alerts as unknown as Array<Record<string, unknown>>));
      return;
    }

    sendSuccess(response, alerts);
  }),

  update: asyncHandler(async (request, response) => {
    const params = alertParamsSchema.parse(request.params);
    const body = updateAlertSchema.parse(request.body);

    sendSuccess(response, {
      id: params.id,
      status: body.status,
      updatedAt: new Date().toISOString(),
    });
  }),
};
