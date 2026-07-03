import { Badge } from '@/components/ui/Badge';
import type { AlertPriority, OrderStatus } from '@/types/domain';

const orderLabels: Record<OrderStatus, string> = {
  new: 'Novo',
  awaiting_payment: 'Pagamento',
  paid: 'Pago',
  awaiting_shipping: 'A enviar',
  shipped: 'Enviado',
  delivered: 'Entregue',
  delayed: 'Atrasado',
  cancelled: 'Cancelado',
};

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => {
  const tone =
    status === 'paid' || status === 'delivered'
      ? 'green'
      : status === 'delayed' || status === 'cancelled'
        ? 'red'
        : status === 'awaiting_payment' || status === 'awaiting_shipping'
          ? 'amber'
          : 'blue';

  return <Badge tone={tone}>{orderLabels[status]}</Badge>;
};

export const PriorityBadge = ({ priority }: { priority: AlertPriority }) => {
  const labels: Record<AlertPriority, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica',
  };
  const tone =
    priority === 'critical' ? 'red' : priority === 'high' ? 'amber' : priority === 'medium' ? 'purple' : 'green';

  return <Badge tone={tone}>{labels[priority]}</Badge>;
};
