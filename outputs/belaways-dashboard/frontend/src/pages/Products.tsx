import { Download, Eye, Filter, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { useProducts } from '@/hooks/use-data';
import { downloadUrl, formatCurrency, formatDate } from '@/lib/utils';
import type { Product } from '@/types/domain';

export const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const { data = [], isLoading } = useProducts(search);

  const columns: Array<DataColumn<Product>> = [
    {
      header: 'Produto',
      cell: (product) => (
        <div className="flex min-w-72 items-center gap-3">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt="" className="h-10 w-10 rounded-lg border border-zinc-200 object-contain p-1 dark:border-zinc-800" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-zinc-950 dark:text-white">{product.name}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{product.sku}</p>
          </div>
        </div>
      ),
    },
    { header: 'Categoria', cell: (product) => product.category ?? <Badge>Sem categoria</Badge> },
    { header: 'Estoque', cell: (product) => product.stock },
    { header: 'Mínimo', cell: (product) => product.minimumStock },
    { header: 'Preço', cell: (product) => formatCurrency(product.price) },
    {
      header: 'Status',
      cell: (product) =>
        product.stock <= 0 ? <Badge tone="red">Zerado</Badge> : product.stock <= product.minimumStock ? <Badge tone="amber">Baixo</Badge> : <Badge tone="green">OK</Badge>,
    },
    { header: 'Atualizado', cell: (product) => formatDate(product.updatedAt) },
    {
      header: '',
      cell: (product) => (
        <Link to={`/products/${product.id}`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white" aria-label="Ver produto">
          <Eye className="h-4 w-4" aria-hidden="true" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtos"
        description="Consulta operacional de cadastro, estoque, preço e inconsistências."
        actions={
          <Button variant="secondary" onClick={() => downloadUrl('/api/products?format=csv')}>
            <Download className="h-4 w-4" aria-hidden="true" />
            CSV
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input value={search} onChange={(event) => setSearchParams(event.target.value ? { search: event.target.value } : {})} placeholder="Pesquisar por nome ou SKU" className="pl-9" />
        </div>
        <Select className="md:w-44" aria-label="Filtro de estoque">
          <option>Todos</option>
          <option>Estoque baixo</option>
          <option>Sem estoque</option>
        </Select>
        <Button variant="secondary">
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filtrar
        </Button>
      </div>

      <DataTable rows={isLoading ? [] : data} columns={columns} empty="Nenhum produto localizado." />
    </div>
  );
};
