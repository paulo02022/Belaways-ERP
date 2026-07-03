import { Clock, Truck } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { OrderStatusBadge } from '@/components/ui/StatusBadge';
import { useLogistics } from '@/hooks/use-data';
import { formatDate } from '@/lib/utils';
import type { LogisticsOccurrence } from '@/types/domain';

export const Logistics = () => {
  const { data = [], isLoading } = useLogistics();
  const columns: Array<DataColumn<LogisticsOccurrence>> = [
    { header: 'Pedido', cell: (item) => `#${item.orderNumber}` },
    { header: 'Cliente', cell: (item) => item.customerName },
    { header: 'Envio', cell: (item) => item.shippingMethod },
    { header: 'Situação', cell: (item) => <OrderStatusBadge status={item.status} /> },
    { header: 'Prazo', cell: (item) => formatDate(item.promisedAt) },
    {
      header: 'Risco',
      cell: (item) => (
        <Badge tone={item.risk === 'critical' ? 'red' : item.risk === 'medium' ? 'amber' : 'green'}>
          {item.risk === 'critical' ? 'Crítico' : item.risk === 'medium' ? 'Médio' : 'Baixo'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Ocorrências logísticas" description="Pedidos em preparação, envio e atraso com foco em SLA." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader title="Acompanhamento" action={<Truck className="h-5 w-5 text-brand-600" />} />
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-950 dark:text-white">{data.length}</p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Ocorrências em aberto</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Prazo crítico" action={<Clock className="h-5 w-5 text-red-500" />} />
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-950 dark:text-white">
              {data.filter((item) => item.risk === 'critical').length}
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Pedidos exigindo ação</p>
          </CardContent>
        </Card>
      </div>
      <DataTable rows={isLoading ? [] : data} columns={columns} />
    </div>
  );
};
