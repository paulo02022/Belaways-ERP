import { Download } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAudits } from '@/hooks/use-data';
import { downloadApiFile } from '@/api/client';
import { formatDate } from '@/lib/utils';
import type { AuditLog } from '@/types/domain';

export const Audit = () => {
  const { data = [], isLoading } = useAudits();
  const columns: Array<DataColumn<AuditLog>> = [
    {
      header: 'Ação',
      cell: (log) => (
        <div className="min-w-72">
          <p className="font-medium text-zinc-950 dark:text-white">{log.action}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{log.description}</p>
        </div>
      ),
    },
    { header: 'Usuário', cell: (log) => log.userEmail },
    { header: 'IP', cell: (log) => log.ipAddress },
    { header: 'Resultado', cell: (log) => <Badge tone={log.result === 'success' ? 'green' : 'red'}>{log.result}</Badge> },
    { header: 'Horário', cell: (log) => formatDate(log.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Auditoria" description="Histórico de ações, usuários, IPs, resultados e entidades relacionadas." actions={<Button variant="secondary" onClick={() => void downloadApiFile('/api/audits?format=csv', 'auditoria-belaways.csv')}><Download className="h-4 w-4" aria-hidden="true" />CSV</Button>} />
      <DataTable rows={isLoading ? [] : data} columns={columns} />
    </div>
  );
};
