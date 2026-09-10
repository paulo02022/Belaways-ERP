import { Download, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { PriorityBadge } from '@/components/ui/StatusBadge';
import { useAlerts } from '@/hooks/use-data';
import { downloadApiFile } from '@/api/client';
import { formatDate } from '@/lib/utils';
import type { Alert } from '@/types/domain';

export const Alerts = () => {
  const { data = [], isLoading } = useAlerts();

  const columns: Array<DataColumn<Alert>> = [
    {
      header: 'Alerta',
      cell: (alert) => (
        <div className="min-w-72">
          <p className="font-medium text-zinc-950 dark:text-white">{alert.title}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{alert.description}</p>
        </div>
      ),
    },
    { header: 'Prioridade', cell: (alert) => <PriorityBadge priority={alert.priority} /> },
    { header: 'Origem', cell: (alert) => <Badge tone="purple">{alert.source}</Badge> },
    { header: 'Entidade', cell: (alert) => alert.entityLabel ?? '-' },
    { header: 'Criado em', cell: (alert) => formatDate(alert.createdAt) },
    {
      header: '',
      cell: () => (
        <Button variant="secondary" size="sm">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Validar
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Alertas" description="Prioridades operacionais geradas a partir de produtos, pedidos e integrações." actions={<Button variant="secondary" onClick={() => void downloadApiFile('/api/alerts?format=csv', 'alertas-belaways.csv')}><Download className="h-4 w-4" aria-hidden="true" />CSV</Button>} />
      <DataTable rows={isLoading ? [] : data} columns={columns} />
    </div>
  );
};
