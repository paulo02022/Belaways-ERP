import { ShieldCheck, UserPlus } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { useUsers } from '@/hooks/use-data';
import type { AuthenticatedUser } from '@/types/domain';

const roleLabels: Record<AuthenticatedUser['role'], string> = {
  admin: 'Admin',
  manager: 'Gestor',
  operator: 'Operador',
  viewer: 'Leitura',
};

export const Users = () => {
  const { data = [], isLoading } = useUsers();
  const columns: Array<DataColumn<AuthenticatedUser>> = [
    {
      header: 'Usuário',
      cell: (user) => (
        <div>
          <p className="font-medium text-zinc-950 dark:text-white">{user.fullName}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
        </div>
      ),
    },
    { header: 'Permissão', cell: (user) => <Badge tone="purple">{roleLabels[user.role]}</Badge> },
    { header: 'Status', cell: (user) => <Badge tone={user.status === 'active' ? 'green' : 'red'}>{user.status}</Badge> },
    {
      header: '',
      cell: () => (
        <Button variant="secondary" size="sm">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Permissões
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Usuários" description="Controle de acesso, perfis e permissões da operação." actions={<Button><UserPlus className="h-4 w-4" aria-hidden="true" />Novo usuário</Button>} />
      <DataTable rows={isLoading ? [] : data} columns={columns} />
    </div>
  );
};
