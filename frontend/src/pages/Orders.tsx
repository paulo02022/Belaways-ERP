import { CalendarRange, Download, Eye, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { OrderStatusBadge } from '@/components/ui/StatusBadge';
import { useOrders } from '@/hooks/use-data';
import { downloadApiFile } from '@/api/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Order } from '@/types/domain';

const validPeriods = new Set([30, 90, 365]);

export const Orders = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const requestedDays = Number(searchParams.get('days') ?? 90);
  const days = validPeriods.has(requestedDays) ? requestedDays : 90;
  const [searchInput, setSearchInput] = useState(search);
  const ordersQuery = useOrders({ search, days });
  const rows = ordersQuery.data ?? [];

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        Object.entries(updates).forEach(([key, value]) => {
          if (!value || (key === 'days' && value === '90')) next.delete(key);
          else next.set(key, value);
        });
        return next;
      });
    },
    [setSearchParams],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput.trim() !== search) updateParams({ search: searchInput.trim() || null });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, searchInput, updateParams]);

  const columns: Array<DataColumn<Order>> = [
    {
      header: 'Pedido',
      cell: (order) => (
        <div>
          <p className="font-semibold tabular-nums text-zinc-950 dark:text-white">#{order.number}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{formatDate(order.createdAt)}</p>
        </div>
      ),
    },
    { header: 'Cliente', cell: (order) => <span className="font-medium text-zinc-800 dark:text-zinc-100">{order.customerName}</span> },
    { header: 'Valor', cell: (order) => <span className="font-semibold tabular-nums">{formatCurrency(order.total)}</span> },
    { header: 'Envio', cell: (order) => order.shippingMethod },
    { header: 'Situação', cell: (order) => <OrderStatusBadge status={order.status} /> },
    { header: 'Prazo', cell: (order) => formatDate(order.promisedAt) },
    {
      header: '',
      cell: (order) => (
        <Link
          to={`/orders/${order.id}`}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:bg-zinc-800 dark:hover:text-white"
          aria-label={`Abrir pedido ${order.number}`}
          title="Abrir pedido"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
        </Link>
      ),
    },
  ];

  const exportQuery = new URLSearchParams({ format: 'csv', days: String(days) });
  if (search) exportQuery.set('search', search);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pedidos recentes"
        description="Do mais novo para o mais antigo, com atualização automática a cada 10 minutos."
        actions={
          <Button
            variant="secondary"
            onClick={() =>
              void downloadApiFile(`/api/orders?${exportQuery}`, 'pedidos-belaways.csv')
            }
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Exportar
          </Button>
        }
      />

      <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" aria-label="Consulta de pedidos">
        <div className="grid gap-3 p-3 md:grid-cols-[minmax(16rem,1fr)_13rem_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Número do pedido ou cliente"
              className="pl-9"
              aria-label="Buscar pedidos"
            />
          </div>
          <Select value={days} onChange={(event) => updateParams({ days: event.target.value })} aria-label="Período dos pedidos">
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
            <option value={365}>Últimos 12 meses</option>
          </Select>
          <Button variant="ghost" size="icon" onClick={() => void ordersQuery.refetch()} disabled={ordersQuery.isFetching} aria-label="Atualizar pedidos" title="Atualizar pedidos">
            <RefreshCw className={`h-4 w-4 ${ordersQuery.isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
          </Button>
        </div>
        <div className="flex items-center gap-2 border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <CalendarRange className="h-4 w-4" aria-hidden="true" />
          {rows.length} pedido(s) encontrado(s) nos últimos {days} dias
        </div>
      </section>

      {ordersQuery.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-10 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          Não foi possível consultar os pedidos agora.
        </div>
      ) : (
        <DataTable
          rows={ordersQuery.isLoading ? [] : rows}
          columns={columns}
          empty={ordersQuery.isLoading ? 'Carregando pedidos…' : 'Nenhum pedido encontrado neste período.'}
        />
      )}
    </div>
  );
};
