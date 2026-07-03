import {
  Barcode,
  Boxes,
  Download,
  Eye,
  ImageOff,
  PackageSearch,
  Search,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { useProducts } from '@/hooks/use-data';
import { downloadUrl, formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import type { Product } from '@/types/domain';

const stockBadge = (product: Product) => {
  if (product.stock === null) return <Badge>Sem saldo</Badge>;
  if (product.stock <= 0) return <Badge tone="red">Zerado</Badge>;
  if (product.stock <= product.minimumStock) return <Badge tone="amber">Baixo</Badge>;
  return <Badge tone="green">OK</Badge>;
};

const statusBadge = (status: string | null) => {
  if (status === 'A') return <Badge tone="green">Ativo</Badge>;
  if (status === 'I') return <Badge tone="red">Inativo</Badge>;
  return status ? <Badge>{status}</Badge> : <Badge>Sem status</Badge>;
};

const smallInfo = (label: string, value: string | number | null | undefined) => (
  <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
    <span>{label}</span>
    <span className="font-medium text-zinc-700 dark:text-zinc-200">{value ?? 'Nao informado'}</span>
  </span>
);

export const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const { data = [], isLoading } = useProducts(search);

  const withImages = data.filter((product) => product.imageUrl).length;
  const withStock = data.filter((product) => product.stock !== null).length;
  const lowStock = data.filter(
    (product) => product.stock !== null && product.stock > 0 && product.stock <= product.minimumStock,
  ).length;
  const outOfStock = data.filter((product) => product.stock !== null && product.stock <= 0).length;
  const stats: Array<{ label: string; value: string; icon: LucideIcon }> = [
    { label: 'Produtos', value: formatNumber(data.length), icon: PackageSearch },
    { label: 'Com imagem', value: formatNumber(withImages), icon: PackageSearch },
    { label: 'Com estoque', value: formatNumber(withStock), icon: Boxes },
    { label: 'Atenção', value: formatNumber(lowStock + outOfStock), icon: Boxes },
  ];

  const columns: Array<DataColumn<Product>> = [
    {
      header: 'Produto',
      cell: (product) => (
        <div className="flex min-w-[24rem] items-center gap-4">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt=""
              className="h-16 w-16 rounded-lg border border-zinc-200 bg-white object-contain p-1 dark:border-zinc-800 dark:bg-zinc-950"
              loading="lazy"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900">
              <ImageOff className="h-5 w-5" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0 space-y-1">
            <p className="line-clamp-2 font-medium leading-5 text-zinc-950 dark:text-white">{product.name}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {smallInfo('SKU', product.sku)}
              {product.ean ? smallInfo('EAN', product.ean) : null}
              {product.brand ? smallInfo('Marca', product.brand) : null}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Cadastro',
      cell: (product) => (
        <div className="space-y-2">
          {statusBadge(product.status)}
          <div className="space-y-1">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
              {product.category || 'Sem categoria'}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Unidade {product.unit ?? 'n/i'} {product.location ? `• ${product.location}` : ''}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: 'Estoque',
      cell: (product) => (
        <div className="space-y-2">
          {stockBadge(product)}
          <div className="text-sm text-zinc-700 dark:text-zinc-200">
            <span className="font-semibold">{product.stock ?? 'n/i'}</span>
            <span className="text-zinc-500 dark:text-zinc-400"> disponível</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Min {product.minimumStock} {product.maximumStock !== null ? `• Max ${product.maximumStock}` : ''}
          </p>
        </div>
      ),
    },
    {
      header: 'Preço',
      cell: (product) => (
        <div className="space-y-1">
          <p className="font-semibold text-zinc-950 dark:text-white">{formatCurrency(product.price)}</p>
          {product.promotionalPrice !== null ? (
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Promo {formatCurrency(product.promotionalPrice)}
            </p>
          ) : null}
          {product.costPrice !== null ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Custo {formatCurrency(product.costPrice)}</p>
          ) : null}
        </div>
      ),
    },
    {
      header: 'Qualidade',
      cell: (product) => (
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={product.imageUrl ? 'green' : 'amber'}>
            <PackageSearch className="h-3.5 w-3.5" aria-hidden="true" />
            Imagem
          </Badge>
          <Badge tone={product.ean ? 'green' : 'amber'}>
            <Barcode className="h-3.5 w-3.5" aria-hidden="true" />
            EAN
          </Badge>
          <Badge tone={product.category ? 'green' : 'amber'}>
            <Tag className="h-3.5 w-3.5" aria-hidden="true" />
            Categoria
          </Badge>
        </div>
      ),
    },
    { header: 'Atualizado', cell: (product) => formatDate(product.updatedAt) },
    {
      header: '',
      cell: (product) => (
        <Link
          to={`/products/${product.id}`}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
          aria-label="Ver produto"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtos"
        description="Cadastro, imagem, preço, estoque e informações fiscais sincronizadas do Tiny."
        actions={
          <Button variant="secondary" onClick={() => downloadUrl('/api/products?format=csv')}>
            <Download className="h-4 w-4" aria-hidden="true" />
            CSV
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <Icon className="h-5 w-5 text-brand-600" aria-hidden="true" />
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={search}
            onChange={(event) => setSearchParams(event.target.value ? { search: event.target.value } : {})}
            placeholder="Pesquisar por nome, SKU ou EAN"
            className="pl-9"
          />
        </div>
        <Select className="md:w-44" aria-label="Filtro de estoque">
          <option>Todos</option>
          <option>Estoque baixo</option>
          <option>Sem estoque</option>
        </Select>
      </div>

      <DataTable rows={isLoading ? [] : data} columns={columns} empty="Nenhum produto localizado." />
    </div>
  );
};
