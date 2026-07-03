import { Download, Eye, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { OrderStatusBadge } from '@/components/ui/StatusBadge';
import { useOrders } from '@/hooks/use-data';
import { downloadUrl, formatCurrency, formatDate } from '@/lib/utils';
import type { Order } from '@/types/domain';

export const Orders = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const { data = [], isLoading } = useOrders(search);

  const columns: Array<DataColumn<Order>> = [
    {
      header: 'Pedido',
      cell: (order) => (
        <div>
          <p className="font-medium text-zinc-950 dark:text-white">#{order.number}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(order.createdAt)}</p>
        </div>
      ),
    },
    { header: 'Cliente', cell: (order) => order.customerName },
    { header: 'Valor', cell: (order) => formatCurrency(order.total) },
    { header: 'Envio', cell: (order) => order.shippingMethod },
    { header: 'Situação', cell: (order) => <OrderStatusBadge status={order.status} /> },
    { header: 'Prazo', cell: (order) => formatDate(order.promisedAt) },
    {
      header: '',
      cell: (order) => (
        <Link to={`/orders/${order.id}`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white" aria-label="Ver pedido">
          <Eye className="h-4 w-4" aria-hidden="true" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Pedidos" description="Acompanhamento de status, clientes, valores, envio e prazos." actions={<Button variant="secondary" onClick={() => downloadUrl('/api/orders?format=csv')}><Download className="h-4 w-4" aria-hidden="true" />CSV</Button>} />
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input value={search} onChange={(event) => setSearchParams(event.target.value ? { search: event.target.value } : {})} placeholder="Pesquisar por pedido ou cliente" className="pl-9" />
      </div>
      <DataTable rows={isLoading ? [] : data} columns={columns} />
    </div>
  );
};
