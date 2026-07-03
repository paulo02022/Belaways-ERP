import { ArrowLeft, Boxes, ClipboardEdit, History, PackageCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { useProduct } from '@/hooks/use-data';
import { formatCurrency, formatDate } from '@/lib/utils';

export const ProductDetails = () => {
  const { id } = useParams();
  const { data: product, isLoading } = useProduct(id);

  if (isLoading || !product) return <PageHeader title="Produto" description="Carregando cadastro." />;

  const dimensions = product.dimensionsCm;

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={`${product.sku} • atualizado em ${formatDate(product.updatedAt)}`}
        actions={
          <Link to="/products" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:border-brand-200 hover:bg-brand-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardContent>
            <div className="flex aspect-square items-center justify-center rounded-lg bg-zinc-50 p-8 dark:bg-zinc-950">
              {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="max-h-full max-w-full object-contain" /> : null}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader title="Estoque" />
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <Boxes className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-zinc-950 dark:text-white">{product.stock}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Mínimo {product.minimumStock}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Preço" />
            <CardContent>
              <p className="text-2xl font-semibold text-zinc-950 dark:text-white">{formatCurrency(product.price)}</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Reservado: {product.reservedStock}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Cadastro" />
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-500 dark:text-zinc-400">Categoria</span>
                <span className="font-medium">{product.category ?? 'Sem categoria'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-500 dark:text-zinc-400">EAN</span>
                {product.ean ? <span>{product.ean}</span> : <Badge tone="amber">Pendente</Badge>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Logística" />
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-500 dark:text-zinc-400">Peso</span>
                <span>{product.weightKg ? `${product.weightKg} kg` : 'Pendente'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-500 dark:text-zinc-400">Dimensões</span>
                <span>
                  {dimensions.width && dimensions.height && dimensions.length
                    ? `${dimensions.width} x ${dimensions.height} x ${dimensions.length} cm`
                    : 'Pendente'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Informações internas" action={<ClipboardEdit className="h-5 w-5 text-brand-600" />} />
          <CardContent>
            <textarea className="min-h-32 w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:ring-brand-950" placeholder="Observações internas do time" />
            <Button className="mt-3">Salvar</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Histórico" action={<History className="h-5 w-5 text-brand-600" />} />
          <CardContent className="space-y-3">
            {['Cadastro sincronizado do Tiny', 'Estoque validado', 'Preço revisado'].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm">
                <PackageCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
