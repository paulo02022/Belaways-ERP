import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  ClipboardList,
  PackageCheck,
  PackageX,
  RefreshCw,
  ShoppingBag,
  Wifi,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { useDashboard, useSyncProducts } from '@/hooks/use-data';
import { formatCurrency, formatDate } from '@/lib/utils';

export const Dashboard = () => {
  const { data, isLoading, refetch, isFetching } = useDashboard();
  const syncProducts = useSyncProducts();
  const isSyncing = isFetching || syncProducts.isPending;

  const handleSync = () => {
    void syncProducts.mutateAsync().then(() => refetch()).catch(() => undefined);
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Indicadores operacionais consolidados." />
        <LoadingState />
      </div>
    );
  }

  const metrics = data.metrics;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Indicadores operacionais consolidados."
        actions={
          <>
            <Badge tone={data.apiStatus === 'online' ? 'green' : 'amber'}>
              <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
              API {data.apiStatus}
            </Badge>
            <Button variant="secondary" onClick={handleSync} disabled={isSyncing}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Sincronizar
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Produtos cadastrados" value={metrics.totalProducts} icon={PackageCheck} tone="purple" />
        <StatCard title="Pedidos hoje" value={metrics.ordersToday} icon={ShoppingBag} tone="green" />
        <StatCard title="Pedidos na semana" value={metrics.ordersWeek} icon={CalendarDays} tone="blue" />
        <StatCard title="Pedidos no mês" value={metrics.ordersMonth} icon={ClipboardList} tone="purple" />
        <StatCard title="Sem estoque" value={metrics.outOfStockProducts} icon={PackageX} tone="red" />
        <StatCard title="Estoque baixo" value={metrics.lowStockProducts} icon={Boxes} tone="amber" />
        <StatCard title="Pedidos atrasados" value={metrics.delayedOrders} icon={AlertTriangle} tone="red" />
        <StatCard title="Inconsistências" value={metrics.inconsistencies} icon={AlertTriangle} tone="amber" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Pedidos e receita" description={`Última sincronização: ${formatDate(data.lastSyncAt)}`} />
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.salesTrend}>
                <defs>
                  <linearGradient id="ordersGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#8e44ad" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#8e44ad" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="label" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value, name) => (name === 'receita' ? [formatCurrency(Number(value)), 'Receita'] : [value, 'Pedidos'])} />
                <Area type="monotone" dataKey="receita" stroke="#8e44ad" fill="url(#ordersGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Estoque por categoria" />
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.stockByCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="category" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="estoque" radius={[6, 6, 0, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader title="Pedidos por situação" />
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.ordersByStatus.map((item) => (
            <div key={item.status} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{item.status}</p>
              <p className="mt-2 text-xl font-semibold text-zinc-950 dark:text-white">{item.quantidade}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
