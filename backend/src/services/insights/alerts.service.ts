import type { Alert, Order, Product } from '../../types/domain.js';

const priorities = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
} as const;

const createAlert = (
  id: string,
  title: string,
  description: string,
  priority: Alert['priority'],
  source: Alert['source'],
  entityId: string,
  entityLabel: string,
): Alert => ({
  id,
  title,
  description,
  priority,
  status: 'open',
  source,
  entityId,
  entityLabel,
  createdAt: new Date().toISOString(),
});

export class AlertsService {
  generate(products: Product[], orders: Order[]): Alert[] {
    const alerts: Alert[] = [];

    products.forEach((product) => {
      if (product.stock !== null && product.stock <= 0) {
        alerts.push(
          createAlert(
            `stock-zero-${product.id}`,
            'Estoque zerado',
            `${product.name} esta sem saldo disponivel.`,
            'critical',
            'product',
            product.id,
            product.sku,
          ),
        );
      } else if (product.stock !== null && product.stock <= product.minimumStock) {
        alerts.push(
          createAlert(
            `stock-low-${product.id}`,
            'Estoque baixo',
            `${product.name} esta abaixo do estoque minimo.`,
            'high',
            'product',
            product.id,
            product.sku,
          ),
        );
      }

      if (!product.ean) {
        alerts.push(
          createAlert(
            `ean-${product.id}`,
            'Produto sem EAN',
            `${product.name} precisa de EAN para reduzir inconsistencias fiscais.`,
            'high',
            'product',
            product.id,
            product.sku,
          ),
        );
      }

      if (product.price <= 0) {
        alerts.push(
          createAlert(
            `price-${product.id}`,
            'Preco invalido',
            `${product.name} possui preco zerado ou invalido.`,
            'critical',
            'product',
            product.id,
            product.sku,
          ),
        );
      }
    });

    const seenSkus = new Set<string>();
    products.forEach((product) => {
      if (!product.sku) return;

      if (seenSkus.has(product.sku)) {
        alerts.push(
          createAlert(
            `duplicate-${product.id}`,
            'Produto duplicado',
            `${product.sku} aparece em mais de um cadastro.`,
            'high',
            'product',
            product.id,
            product.sku,
          ),
        );
      }

      seenSkus.add(product.sku);
    });

    orders.forEach((order) => {
      if (order.status === 'delayed') {
        alerts.push(
          createAlert(
            `delayed-${order.id}`,
            'Pedido atrasado',
            `Pedido ${order.number} esta atrasado.`,
            'high',
            'order',
            order.id,
            order.number,
          ),
        );
      }

      if (order.status === 'awaiting_payment') {
        alerts.push(
          createAlert(
            `payment-${order.id}`,
            'Pedido aguardando pagamento',
            `Pedido ${order.number} ainda aguarda pagamento.`,
            'medium',
            'order',
            order.id,
            order.number,
          ),
        );
      }

      if (order.status === 'awaiting_shipping') {
        alerts.push(
          createAlert(
            `shipping-${order.id}`,
            'Pedido aguardando envio',
            `Pedido ${order.number} esta pronto para acompanhar envio.`,
            'medium',
            'order',
            order.id,
            order.number,
          ),
        );
      }
    });

    return alerts.sort((first, second) => priorities[second.priority] - priorities[first.priority]);
  }
}

export const alertsService = new AlertsService();
