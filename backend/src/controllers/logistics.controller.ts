import { sendSuccess } from '../api/response.js';
import { asyncHandler } from '../lib/async-handler.js';
import { tinyService } from '../services/tiny/tiny.service.js';

export const logisticsController = {
  index: asyncHandler(async (_request, response) => {
    const orders = await tinyService.listOrders({ page: 1 });
    const occurrences = orders
      .filter((order) => ['awaiting_shipping', 'shipped', 'delayed'].includes(order.status))
      .map((order) => ({
        id: `LOG-${order.id}`,
        orderId: order.id,
        orderNumber: order.number,
        customerName: order.customerName,
        status: order.status,
        shippingMethod: order.shippingMethod,
        promisedAt: order.promisedAt,
        risk:
          order.status === 'delayed' ? 'critical' : order.status === 'awaiting_shipping' ? 'medium' : 'low',
      }));

    sendSuccess(response, occurrences);
  }),
};
