import {
  AlertTriangle,
  ArrowDownAZ,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  ImageOff,
  PackageCheck,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { useProducts, useProductsSummary, useSyncProducts, type ProductFilters } from '@/hooks/use-data';
import { downloadApiFile } from '@/api/client';
import { formatCurrency, formatDate, formatNumber, formatRelativeTime } from '@/lib/utils';
import type { PaginationMeta, Product } from '@/types/domain';

const pageSize = 40;

const stockBadge = (product: Product) => {
  if (product.stock === null) return <Badge>Sem saldo</Badge>;
  if (product.stock <= 0) return <Badge tone="red">Zerado</Badge>;
  if (product.stock <= product.minimumStock) return <Badge tone="amber">Baixo</Badge>;
  return <Badge tone="green">Disponível</Badge>;
};

const statusBadge = (status: string | null) => {
  if (status === 'A') return <Badge tone="green">Ativo</Badge>;
  if (status === 'I') return <Badge tone="red">Inativo</Badge>;
  return <Badge>{status || 'Sem status'}</Badge>;
};

export const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const stock = (searchParams.get('stock') ?? 'all') as ProductFilters['stock'];
  const status = (searchParams.get('status') ?? 'active') as ProductFilters['status'];
  const sort = (searchParams.get('sort') ?? 'updated') as ProductFilters['sort'];
  const page = Math.max(Number(searchParams.get('page') ?? 1), 1);
  const search = searchParams.get('search') ?? '';
  const filters = useMemo<ProductFilters>(
    () => ({ search, page, pageSize, stock, status, sort, order: sort === 'name' ? 'asc' : 'desc' }),
    [page, search, sort, status, stock],
  );
  const productsQuery = useProducts(filters);
  const summaryQuery = useProductsSummary(status);
  const syncProducts = useSyncProducts();
  const rows = productsQuery.data?.data ?? [];
  const meta = productsQuery.data?.meta as PaginationMeta | undefined;
  const summary = summaryQuery.data;
  const isCatalogFresh = Boolean(
    summary?.lastSyncAt && Date.now() - new Date(summary.lastSyncAt).getTime() < 24 * 60 * 60 * 1000,
  );

  const updateParams = useCallback((updates: Record<string, string | null>, resetPage = true) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(updates).forEach(([key, value]) => {
        if (!value || value === 'all' || (key === 'status' && value === 'active') || (key === 'sort' && value === 'updated')) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });
      if (resetPage) next.delete('page');
      return next;
    });
  }, [setSearchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput.trim() !== search) updateParams({ search: searchInput.trim() || null });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, searchInput, updateParams]);

  const handleSync = () => {
    syncProducts.reset();
    syncProducts.mutate('incremental');
  };

  const handleFullSync = () => {
    syncProducts.reset();
    syncProducts.mutate('full');
  };

  const columns: Array<DataColumn<Product>> = [
    {
      header: 'Produto',
      cell: (product) => (
        <div className="flex min-w-[20rem] items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt="" className="h-full w-full object-contain p-1" loading="lazy" />
            ) : (
              <ImageOff className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 font-semibold leading-5 text-zinc-950 dark:text-white">{product.name}</p>
            <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
              SKU {product.sku || 'não informado'}{product.brand ? ` · ${product.brand}` : ''}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: 'Cadastro',
      cell: (product) => (
        <div className="space-y-1.5">
          {statusBadge(product.status)}
          <p className="max-w-44 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {product.category || 'Sem categoria'}
          </p>
        </div>
      ),
    },
    {
      header: 'Estoque',
      cell: (product) => (
        <div className="space-y-1.5 tabular-nums">
          {stockBadge(product)}
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {product.stock ?? 'n/i'} un. · mín. {product.minimumStock}
          </p>
        </div>
      ),
    },
    {
      header: 'Preço',
      cell: (product) => (
        <div className="tabular-nums">
          <p className="font-semibold text-zinc-950 dark:text-white">{formatCurrency(product.price)}</p>
          {product.promotionalPrice !== null ? (
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
              Promo {formatCurrency(product.promotionalPrice)}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      header: 'Sincronizado',
      cell: (product) => (
        <span className="whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
          {formatDate(product.syncedAt ?? product.updatedAt)}
        </span>
      ),
    },
    {
      header: '',
      cell: (product) => (
        <Link
          to={`/products/${product.id}`}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:bg-zinc-800 dark:hover:text-white"
          aria-label={`Abrir ${product.name}`}
          title="Abrir produto"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
        </Link>
      ),
    },
  ];

  const catalogStats = [
    { label: 'Ativos no catálogo', value: summary?.total ?? 0, icon: PackageCheck, tone: 'text-brand-700 dark:text-brand-300' },
    { label: 'Com imagem', value: summary?.withImage ?? 0, icon: Sparkles, tone: 'text-sky-700 dark:text-sky-300' },
    { label: 'Com saldo lido', value: summary?.withStock ?? 0, icon: Boxes, tone: 'text-emerald-700 dark:text-emerald-300' },
    { label: 'Precisam de atenção', value: (summary?.lowStock ?? 0) + (summary?.outOfStock ?? 0), icon: AlertTriangle, tone: 'text-amber-700 dark:text-amber-300' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Catálogo de produtos"
        description="Consulta rápida do cadastro, preço e disponibilidade sincronizados com a Olist Tiny."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => void downloadApiFile('/api/products?format=csv', 'produtos-belaways.csv')}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Exportar
            </Button>
            <Button onClick={handleSync} disabled={syncProducts.isPending}>
              <RefreshCw className={`h-4 w-4 ${syncProducts.isPending ? 'animate-spin' : ''}`} aria-hidden="true" />
              {syncProducts.isPending ? 'Atualizando' : 'Atualizar agora'}
            </Button>
          </>
        }
      />

      <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" aria-label="Pulso do catálogo">
        <div className="flex flex-col gap-3 border-b border-zinc-100 bg-zinc-50/70 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className={`h-2 w-2 rounded-full ${isCatalogFresh ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Pulso do catálogo</span>
            <span className="text-zinc-500 dark:text-zinc-400">
              {summary?.lastSyncAt ? `última alteração recebida ${formatRelativeTime(summary.lastSyncAt)}` : 'sem sincronização registrada'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {syncProducts.isSuccess ? (
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                {syncProducts.data.unavailableSources?.length
                  ? 'Atualização parcial; extensão de tempo real indisponível'
                  : `${syncProducts.data.totalProducts} produto(s) recebido(s)`}
              </span>
            ) : null}
            {syncProducts.isError ? (
              <span className="text-xs font-medium text-red-700 dark:text-red-300">Não foi possível consultar a Olist agora.</span>
            ) : null}
            <button
              type="button"
              className="text-xs font-semibold text-brand-700 underline-offset-4 hover:underline disabled:opacity-50 dark:text-brand-300"
              onClick={handleFullSync}
              disabled={syncProducts.isPending}
            >
              Recarregar catálogo completo
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-zinc-100 dark:divide-zinc-800 lg:grid-cols-4 lg:divide-y-0">
          {catalogStats.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="flex min-h-24 items-center gap-3 px-4 py-4 sm:px-5">
              <Icon className={`h-5 w-5 shrink-0 ${tone}`} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xl font-semibold tabular-nums text-zinc-950 dark:text-white">{formatNumber(value)}</p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" aria-label="Filtros do catálogo">
        <div className="grid gap-3 p-3 md:grid-cols-[minmax(16rem,1fr)_11rem_11rem_12rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar nome, SKU ou EAN"
              className="pl-9"
              aria-label="Buscar produtos"
            />
          </div>
          <Select value={stock} onChange={(event) => updateParams({ stock: event.target.value })} aria-label="Filtrar estoque">
            <option value="all">Todo estoque</option>
            <option value="low">Estoque baixo</option>
            <option value="out">Sem estoque</option>
          </Select>
          <Select value={status} onChange={(event) => updateParams({ status: event.target.value })} aria-label="Filtrar situação">
            <option value="active">Somente ativos</option>
            <option value="inactive">Inativos</option>
            <option value="all">Todos os status</option>
          </Select>
          <Select value={sort} onChange={(event) => updateParams({ sort: event.target.value })} aria-label="Ordenar produtos">
            <option value="updated">Mais recentes</option>
            <option value="name">Nome A–Z</option>
            <option value="stock">Maior estoque</option>
            <option value="price">Maior preço</option>
          </Select>
        </div>
        <div className="flex flex-col gap-2 border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2">
            <ArrowDownAZ className="h-4 w-4" aria-hidden="true" />
            {meta ? `${formatNumber(meta.total)} resultado(s) · página ${meta.page} de ${meta.totalPages}` : 'Preparando catálogo'}
          </span>
          {productsQuery.isFetching && !productsQuery.isLoading ? <span>Atualizando esta página…</span> : null}
        </div>
      </section>

      <div className={productsQuery.isFetching && !productsQuery.isLoading ? 'opacity-70 transition-opacity' : ''} aria-busy={productsQuery.isFetching}>
        {productsQuery.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-10 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            Não foi possível carregar o catálogo. Tente novamente em alguns instantes.
          </div>
        ) : (
          <DataTable
            rows={productsQuery.isLoading ? [] : rows}
            columns={columns}
            empty={productsQuery.isLoading ? 'Carregando produtos…' : 'Nenhum produto localizado com estes filtros.'}
          />
        )}
      </div>

      <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Resultados da consulta atual</p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" disabled={!meta || meta.page <= 1 || productsQuery.isFetching} onClick={() => updateParams({ page: String(page - 1) }, false)} aria-label="Página anterior" title="Página anterior">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span className="min-w-20 text-center text-sm font-medium tabular-nums text-zinc-700 dark:text-zinc-200">
            {meta ? `${meta.page} / ${meta.totalPages}` : '—'}
          </span>
          <Button variant="secondary" size="icon" disabled={!meta || meta.page >= meta.totalPages || productsQuery.isFetching} onClick={() => updateParams({ page: String(page + 1) }, false)} aria-label="Próxima página" title="Próxima página">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
};
