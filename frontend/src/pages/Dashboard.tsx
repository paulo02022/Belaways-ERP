import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  PackageCheck,
  PackageX,
  RefreshCw,
  ShoppingBag,
  Wifi,
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { useDashboard, useSyncProducts } from '@/hooks/use-data';
import { formatCurrency, formatNumber, formatRelativeTime } from '@/lib/utils';

export const Dashboard = () => {
  const { data, isLoading, isError, refetch, isFetching } = useDashboard();
  const syncProducts = useSyncProducts();
  const isSyncing = isFetching || syncProducts.isPending;

  const handleSync = () => {
    void syncProducts.mutateAsync('incremental').then(() => refetch()).catch(() => undefined);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Central de operação" description="Visão consolidada do catálogo, pedidos e exceções." />
        <LoadingState />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Central de operação" description="Visão consolidada do catálogo, pedidos e exceções." />
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          Não foi possível consolidar os indicadores agora.
        </div>
      </div>
    );
  }

  const metrics = data.metrics;
  const primaryMetrics = [
    { label: 'Produtos ativos', value: metrics.totalProducts, detail: 'no catálogo operacional', icon: PackageCheck },
    { label: 'Pedidos hoje', value: metrics.ordersToday, detail: `${metrics.ordersWeek} nos últimos 7 dias`, icon: ShoppingBag },
    { label: 'Pedidos no mês', value: metrics.ordersMonth, detail: 'janela móvel de 30 dias', icon: CalendarDays },
    { label: 'Alertas abertos', value: metrics.openAlerts, detail: 'aguardando análise', icon: AlertTriangle },
  ];
  const exceptions = [
    { label: 'Produtos sem estoque', value: metrics.outOfStockProducts, icon: PackageX, tone: 'text-red-600 dark:text-red-400' },
    { label: 'Estoque abaixo do mínimo', value: metrics.lowStockProducts, icon: Boxes, tone: 'text-amber-600 dark:text-amber-400' },
    { label: 'Pedidos atrasados', value: metrics.delayedOrders, icon: AlertTriangle, tone: 'text-red-600 dark:text-red-400' },
    { label: 'Inconsistências cadastrais', value: metrics.inconsistencies, icon: AlertTriangle, tone: 'text-amber-600 dark:text-amber-400' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Central de operação"
        description="Visão consolidada do catálogo, pedidos e exceções que pedem ação."
        actions={
          <>
            <Badge tone={data.apiStatus === 'online' ? 'green' : 'amber'}>
              <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
              API {data.apiStatus}
            </Badge>
            <Button variant="secondary" onClick={handleSync} disabled={isSyncing}>
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
              {isSyncing ? 'Atualizando' : 'Atualizar dados'}
            </Button>
          </>
        }
      />

      <section className="grid overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo operacional">
        {primaryMetrics.map(({ label, value, detail, icon: Icon }, index) => (
          <div key={label} className={`min-h-32 p-5 ${index > 0 ? 'border-t border-zinc-100 sm:border-l xl:border-t-0 dark:border-zinc-800' : ''} ${index === 2 ? 'sm:border-t xl:border-t-0' : ''}`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
              <Icon className="h-4 w-4 text-brand-600 dark:text-brand-300" aria-hidden="true" />
            </div>
            <p className="mt-4 text-3xl font-semibold tabular-nums text-zinc-950 dark:text-white">{formatNumber(value)}</p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{detail}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.65fr)]">
        <Card>
          <CardHeader
            title="Ritmo de vendas"
            description={`Catálogo sincronizado ${formatRelativeTime(data.lastSyncAt)}`}
          />
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.salesTrend} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="#e4e4e7" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value, name) => (name === 'receita' ? [formatCurrency(Number(value)), 'Receita'] : [value, 'Pedidos'])} />
                <Area type="monotone" dataKey="receita" stroke="#7e22ce" fill="#f3e8ff" fillOpacity={0.65} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Fila de atenção" description="Exceções que afetam venda e entrega." />
          <CardContent className="divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
            {exceptions.map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="flex min-h-16 items-center gap-3 px-5 py-3">
                <Icon className={`h-4 w-4 shrink-0 ${tone}`} aria-hidden="true" />
                <span className="min-w-0 flex-1 text-sm text-zinc-600 dark:text-zinc-300">{label}</span>
                <strong className="text-base tabular-nums text-zinc-950 dark:text-white">{formatNumber(value)}</strong>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader title="Estoque por categoria" description="Categorias com maior volume disponível." />
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.stockByCategory.slice(0, 12)} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="#e4e4e7" strokeDasharray="3 3" />
                <XAxis dataKey="category" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="estoque" radius={[4, 4, 0, 0]} fill="#059669" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Pedidos por situação" />
          <CardContent className="grid grid-cols-2 gap-x-5 gap-y-4">
            {data.ordersByStatus.map((item) => (
              <div key={item.status} className="border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{item.status}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-950 dark:text-white">{item.quantidade}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
