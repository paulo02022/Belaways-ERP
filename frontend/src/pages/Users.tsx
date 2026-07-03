import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Save, ShieldCheck, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { endpoints } from '@/api/endpoints';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { useUsers } from '@/hooks/use-data';
import type { AuthenticatedUser } from '@/types/domain';

const roleLabels: Record<AuthenticatedUser['role'], string> = {
  owner: 'Dono',
  admin: 'Admin',
  manager: 'Gestor',
  operator: 'Operador',
  viewer: 'Leitura',
};

type ManagedRole = Exclude<AuthenticatedUser['role'], 'owner'>;

const managedRoles: ManagedRole[] = ['admin', 'manager', 'operator', 'viewer'];

const emptyCreateForm = {
  fullName: '',
  email: '',
  password: '',
  role: 'operator' as ManagedRole,
};

export const Users = () => {
  const { data = [], isLoading } = useUsers();
  const queryClient = useQueryClient();
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [selectedId, setSelectedId] = useState('');
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'operator' as ManagedRole,
    status: 'active' as AuthenticatedUser['status'],
  });

  const createMutation = useMutation({
    mutationFn: endpoints.createUser,
    onSuccess: async () => {
      setCreateForm(emptyCreateForm);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof endpoints.updateUser>[1] }) =>
      endpoints.updateUser(id, payload),
    onSuccess: async () => {
      setEditForm((current) => ({ ...current, password: '' }));
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const selectUser = (user: AuthenticatedUser) => {
    if (user.role === 'owner') return;

    setSelectedId(user.id);
    setEditForm({
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: user.role,
      status: user.status,
    });
  };

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createMutation.mutate(createForm);
  };

  const handleUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedId) return;

    updateMutation.mutate({
      id: selectedId,
      payload: {
        ...editForm,
        password: editForm.password || undefined,
      },
    });
  };

  const columns: Array<DataColumn<AuthenticatedUser>> = [
    {
      header: 'Usuario',
      cell: (user) => (
        <div>
          <p className="font-medium text-zinc-950 dark:text-white">{user.fullName}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
        </div>
      ),
    },
    { header: 'Permissao', cell: (user) => <Badge tone="purple">{roleLabels[user.role]}</Badge> },
    {
      header: 'Status',
      cell: (user) => <Badge tone={user.status === 'active' ? 'green' : 'red'}>{user.status}</Badge>,
    },
    {
      header: '',
      cell: (user) => (
        <Button variant="secondary" size="sm" disabled={user.role === 'owner'} onClick={() => selectUser(user)}>
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Editar
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description="Controle de acesso, perfis e permissoes da operacao."
        actions={
          <Button>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Novo usuario
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Adicionar pessoa" action={<UserPlus className="h-5 w-5 text-brand-600" />} />
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Nome</span>
                <Input
                  required
                  value={createForm.fullName}
                  onChange={(event) => setCreateForm((current) => ({ ...current, fullName: event.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">E-mail</span>
                <Input
                  required
                  type="email"
                  value={createForm.email}
                  onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Senha</span>
                <Input
                  required
                  type="password"
                  value={createForm.password}
                  onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Permissao</span>
                <Select
                  value={createForm.role}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, role: event.target.value as ManagedRole }))
                  }
                >
                  {managedRoles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </Select>
              </label>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Criar usuario
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Alterar acesso" action={<KeyRound className="h-5 w-5 text-brand-600" />} />
          <CardContent>
            <form onSubmit={handleUpdate} className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Usuario</span>
                <Select
                  value={selectedId}
                  onChange={(event) => {
                    const user = data.find((item) => item.id === event.target.value);
                    if (user) selectUser(user);
                    else setSelectedId('');
                  }}
                >
                  <option value="">Selecione</option>
                  {data
                    .filter((user) => user.role !== 'owner')
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.fullName}
                      </option>
                    ))}
                </Select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Nome</span>
                <Input
                  value={editForm.fullName}
                  onChange={(event) => setEditForm((current) => ({ ...current, fullName: event.target.value }))}
                  disabled={!selectedId}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">E-mail</span>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
                  disabled={!selectedId}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Nova senha</span>
                <Input
                  type="password"
                  value={editForm.password}
                  onChange={(event) => setEditForm((current) => ({ ...current, password: event.target.value }))}
                  disabled={!selectedId}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Permissao</span>
                <Select
                  value={editForm.role}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, role: event.target.value as ManagedRole }))
                  }
                  disabled={!selectedId}
                >
                  {managedRoles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Status</span>
                <Select
                  value={editForm.status}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      status: event.target.value as AuthenticatedUser['status'],
                    }))
                  }
                  disabled={!selectedId}
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </Select>
              </label>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={!selectedId || updateMutation.isPending}>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Salvar alteracoes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <DataTable rows={isLoading ? [] : data} columns={columns} />
    </div>
  );
};
