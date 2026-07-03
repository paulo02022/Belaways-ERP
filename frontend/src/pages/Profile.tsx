import { Mail, Shield, UserCircle } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/hooks/use-auth';

export const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader title="Perfil" description="Dados do usuário autenticado." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200">
                <UserCircle className="h-10 w-10" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-zinc-950 dark:text-white">{user?.fullName}</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{user?.email}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Conta" />
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <Mail className="h-5 w-5 text-brand-600" aria-hidden="true" />
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">E-mail</p>
              <p className="mt-1 font-medium text-zinc-950 dark:text-white">{user?.email}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <Shield className="h-5 w-5 text-brand-600" aria-hidden="true" />
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Perfil</p>
              <p className="mt-1 font-medium text-zinc-950 dark:text-white">{user?.role}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
