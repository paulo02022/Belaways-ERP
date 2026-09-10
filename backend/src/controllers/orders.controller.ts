import { z } from 'zod';

import { sendCsv, sendSuccess } from '../api/response.js';
import { asyncHandler } from '../lib/async-handler.js';
import { AppError } from '../lib/errors.js';
import { tinyService } from '../services/tiny/tiny.service.js';
import { toCsv } from '../utils/csv.js';
import { paginate } from '../utils/pagination.js';

export const ordersQuerySchema = z.object({
  search: z.string().max(120).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  days: z.coerce.number().int().min(30).max(365).optional().default(90),
  status: z.string().max(40).optional(),
  format: z.enum(['json', 'csv']).optional().default('json'),
});

export const orderParamsSchema = z.object({
  id: z.string().min(1).max(80),
});

export const ordersController = {
  index: asyncHandler(async (request, response) => {
    const query = ordersQuerySchema.parse(request.query);
    const orders = await tinyService.listOrders({ search: query.search, page: 1, days: query.days });
    const filtered = query.status ? orders.filter((order) => order.status === query.status) : orders;

    if (query.format === 'csv') {
      sendCsv(response, 'pedidos-belaways.csv', toCsv(filtered as unknown as Array<Record<string, unknown>>));
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
    const { id } = orderParamsSchema.parse(request.params);
    const order = await tinyService.getOrder(id);

    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    }

    sendSuccess(response, order);
  }),
};
