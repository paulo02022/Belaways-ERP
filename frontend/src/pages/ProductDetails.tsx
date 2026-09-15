import {
  ArrowLeft,
  Barcode,
  Boxes,
  ClipboardEdit,
  Link as LinkIcon,
  PackageCheck,
  Ruler,
  Scale,
  Tag,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProductImage } from '@/components/ProductImage';
import { useProduct } from '@/hooks/use-data';
import { formatCurrency, formatDate } from '@/lib/utils';

const valueOrPending = (value: string | number | null | undefined) => value ?? 'Nao informado';

const Field = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
  <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
    <p className="text-xs font-medium uppercase tracking-normal text-zinc-500 dark:text-zinc-400">{label}</p>
    <p className="mt-2 break-words text-sm font-medium text-zinc-950 dark:text-white">{valueOrPending(value)}</p>
  </div>
);

export const ProductDetails = () => {
  const { id } = useParams();
  const { data: product, isLoading } = useProduct(id);

  if (isLoading || !product) return <PageHeader title="Produto" description="Carregando cadastro." />;

  const dimensions = product.dimensionsCm;
  const dimensionsText =
    dimensions.width && dimensions.height && dimensions.length
      ? `${dimensions.width} x ${dimensions.height} x ${dimensions.length} cm`
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={`${product.sku || 'Sem SKU'} • atualizado em ${formatDate(product.updatedAt)}`}
        actions={
          <Link
            to="/products"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:border-brand-200 hover:bg-brand-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </Link>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardContent>
            <div className="flex aspect-square items-center justify-center rounded-lg bg-zinc-50 p-6 dark:bg-zinc-950">
              <ProductImage
                imageUrl={product.imageUrl}
                category={product.category}
                productName={product.name}
                alt={product.name}
                className="h-full w-full rounded-md object-contain"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader title="Estoque" action={<Boxes className="h-5 w-5 text-emerald-600" />} />
            <CardContent>
              <p className="text-3xl font-semibold text-zinc-950 dark:text-white">
                {valueOrPending(product.stock)}
              </p>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Reservado {valueOrPending(product.reservedStock)} • Min {product.minimumStock}
                {product.maximumStock !== null ? ` • Max ${product.maximumStock}` : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Preço" action={<Tag className="h-5 w-5 text-brand-600" />} />
            <CardContent className="space-y-2">
              <p className="text-3xl font-semibold text-zinc-950 dark:text-white">
                {formatCurrency(product.price)}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Promo{' '}
                {product.promotionalPrice !== null ? formatCurrency(product.promotionalPrice) : 'Nao informado'}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Custo {product.costPrice !== null ? formatCurrency(product.costPrice) : 'Nao informado'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Identificação" action={<Barcode className="h-5 w-5 text-brand-600" />} />
            <CardContent className="grid gap-3">
              <Field label="SKU" value={product.sku} />
              <Field label="EAN" value={product.ean} />
              <Field label="NCM" value={product.ncm} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Logística" action={<Ruler className="h-5 w-5 text-brand-600" />} />
            <CardContent className="grid gap-3">
              <Field label="Dimensões" value={dimensionsText} />
              <Field label="Peso líquido" value={product.weightKg ? `${product.weightKg} kg` : null} />
              <Field label="Peso bruto" value={product.grossWeightKg ? `${product.grossWeightKg} kg` : null} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader title="Cadastro no Tiny" action={<PackageCheck className="h-5 w-5 text-brand-600" />} />
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Categoria" value={product.category} />
            <Field label="Marca" value={product.brand} />
            <Field label="Unidade" value={product.unit} />
            <Field label="Status" value={product.status} />
            <Field label="Localização" value={product.location} />
            <Field label="Fornecedor" value={product.supplierName} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Links e mídia" action={<LinkIcon className="h-5 w-5 text-brand-600" />} />
          <CardContent className="space-y-3">
            {product.slug ? <Field label="Slug" value={product.slug} /> : null}
            {product.videoUrl ? <Field label="Vídeo" value={product.videoUrl} /> : null}
            <div className="flex flex-wrap gap-2">
              <Badge tone={product.imageUrl ? 'green' : 'amber'}>Imagem</Badge>
              <Badge tone={product.ean ? 'green' : 'amber'}>EAN</Badge>
              <Badge tone={dimensionsText ? 'green' : 'amber'}>Dimensões</Badge>
              <Badge tone={product.weightKg ? 'green' : 'amber'}>Peso</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Descrição" action={<Scale className="h-5 w-5 text-brand-600" />} />
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300">
              {product.description ?? 'Nao informado'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Informações internas" action={<ClipboardEdit className="h-5 w-5 text-brand-600" />} />
          <CardContent>
            <textarea
              className="min-h-32 w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:ring-brand-950"
              placeholder="Observações internas do time"
            />
            <Button className="mt-3">Salvar</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
