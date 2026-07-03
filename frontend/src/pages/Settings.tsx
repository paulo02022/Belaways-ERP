import { Bell, Database, KeyRound, Save } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { usePreferences } from '@/hooks/use-data';

export const Settings = () => {
  const { data } = usePreferences();

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Preferências, integrações e parâmetros operacionais." actions={<Button><Save className="h-4 w-4" aria-hidden="true" />Salvar</Button>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Preferências" action={<Bell className="h-5 w-5 text-brand-600" />} />
          <CardContent className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Tema</span>
              <Select defaultValue={data?.theme ?? 'system'}>
                <option value="system">Sistema</option>
                <option value="light">Claro</option>
                <option value="dark">Escuro</option>
              </Select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Estoque mínimo padrão</span>
              <Input type="number" defaultValue={data?.lowStockThreshold ?? 10} />
            </label>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Integrações" action={<Database className="h-5 w-5 text-brand-600" />} />
          <CardContent className="space-y-4">
            {['Tiny ERP', 'Supabase Auth', 'Supabase Database'].map((item) => (
              <div key={item} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <KeyRound className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                  <span className="font-medium text-zinc-950 dark:text-white">{item}</span>
                </div>
                <span className="text-sm text-emerald-600 dark:text-emerald-300">Preparado</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
