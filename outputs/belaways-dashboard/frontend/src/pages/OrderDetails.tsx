import { ArrowLeft, Package, Truck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { OrderStatusBadge } from '@/components/ui/StatusBadge';
import { useOrder } from '@/hooks/use-data';
import { formatCurrency, formatDate } from '@/lib/utils';

type OrderItemRow = { id: string; sku: string; name: string; quantity: number; unitPrice: number };

export const OrderDetails = () => {
  const { id } = useParams();
  const { data: order, isLoading } = useOrder(id);

  if (isLoading || !order) return <PageHeader title="Pedido" description="Carregando pedido." />;

  const itemRows: OrderItemRow[] = order.items.map((item) => ({
    id: item.productId,
    sku: item.sku,
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  }));

  const columns: Array<DataColumn<OrderItemRow>> = [
    { header: 'SKU', cell: (item) => item.sku },
    { header: 'Produto', cell: (item) => item.name },
    { header: 'Qtd.', cell: (item) => item.quantity },
    { header: 'Unitário', cell: (item) => formatCurrency(item.unitPrice) },
    { header: 'Total', cell: (item) => formatCurrency(item.unitPrice * item.quantity) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={`Pedido #${order.number}`} description={`${order.customerName} • ${formatDate(order.createdAt)}`} actions={<Link to="/orders" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:border-brand-200 hover:bg-brand-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Voltar</Link>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Situação" />
          <CardContent>
            <OrderStatusBadge status={order.status} />
            <p className="mt-4 text-2xl font-semibold text-zinc-950 dark:text-white">{formatCurrency(order.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Envio" action={<Truck className="h-5 w-5 text-brand-600" />} />
          <CardContent>
            <p className="font-medium text-zinc-950 dark:text-white">{order.shippingMethod}</p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Prazo: {formatDate(order.promisedAt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Itens" action={<Package className="h-5 w-5 text-brand-600" />} />
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-950 dark:text-white">{order.items.length}</p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Produtos no pedido</p>
          </CardContent>
        </Card>
      </div>
      <DataTable rows={itemRows} columns={columns} />
    </div>
  );
};
