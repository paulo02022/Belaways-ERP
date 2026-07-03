import { hasSupabaseConfig, supabaseAdmin } from '../../database/supabase.js';
import { logger } from '../../lib/logger.js';
import type { Product } from '../../types/domain.js';

type ProductSyncResult = {
  persisted: boolean;
  runId: string | null;
  processed: number;
};

type ProductCacheInput =
  | Product
  | {
      product: Product;
      rawPayload?: Record<string, unknown> | null;
      stockPayload?: Record<string, unknown> | null;
    };

type ProductCacheFilters = {
  search?: string;
  category?: string;
  stock?: 'all' | 'low' | 'out';
};

type ProductCacheRow = {
  tiny_id: string;
  sku: string | null;
  name: string;
  category: string | null;
  ean: string | null;
  status: string | null;
  unit: string | null;
  brand: string | null;
  price: number | string | null;
  promotional_price: number | string | null;
  cost_price: number | string | null;
  stock_quantity: number | string | null;
  reserved_stock: number | string | null;
  minimum_stock: number | string | null;
  maximum_stock: number | string | null;
  weight_net_kg: number | string | null;
  weight_gross_kg: number | string | null;
  width_cm: number | string | null;
  height_cm: number | string | null;
  length_cm: number | string | null;
  image_url: string | null;
  raw_payload: Record<string, unknown> | null;
  stock_payload: Record<string, unknown> | null;
  synced_at: string | null;
  updated_at: string | null;
};

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const supabasePageSize = 1000;

const isMissingProductTable = (error: { code?: string; message?: string }) =>
  error.code === '42P01' ||
  error.code === 'PGRST205' ||
  Boolean(error.message?.toLowerCase().includes('product_cache'));

const asNumber = (value: unknown, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asOptionalNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  return asNumber(value);
};

const asOptionalString = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
};

const firstImageUrl = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value.trim() || null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstImageUrl(item);
      if (found) return found;
    }
  }

  if (typeof value === 'object') {
    const object = value as Record<string, unknown>;
    for (const key of [
      'url',
      'src',
      'href',
      'link',
      'anexo',
      'imagem',
      'imagem_externa',
      'url_imagem',
      'thumbnail',
      'miniatura',
    ]) {
      const found = firstImageUrl(object[key]);
      if (found) return found;
    }
  }

  return null;
};

const normalizeInput = (input: ProductCacheInput) =>
  'product' in input ? input : { product: input, rawPayload: null, stockPayload: null };

const mapRowToProduct = (row: ProductCacheRow): Product => {
  const raw = row.raw_payload ?? {};

  return {
    id: row.tiny_id,
    sku: row.sku ?? asOptionalString(raw.codigo) ?? '',
    name: row.name,
    category: row.category ?? asOptionalString(raw.categoria),
    ean: row.ean ?? asOptionalString(raw.gtin),
    status: row.status ?? asOptionalString(raw.situacao),
    unit: row.unit ?? asOptionalString(raw.unidade),
    brand: row.brand ?? asOptionalString(raw.marca),
    location: asOptionalString(raw.localizacao),
    ncm: asOptionalString(raw.ncm),
    supplierName: asOptionalString(raw.nome_fornecedor),
    promotionalPrice: asOptionalNumber(row.promotional_price ?? raw.preco_promocional),
    costPrice: asOptionalNumber(row.cost_price ?? raw.preco_custo_medio ?? raw.preco_custo),
    price: asNumber(row.price ?? raw.preco),
    stock: asOptionalNumber(row.stock_quantity),
    reservedStock: asOptionalNumber(row.reserved_stock),
    minimumStock: asNumber(row.minimum_stock ?? raw.estoque_minimo),
    maximumStock: asOptionalNumber(row.maximum_stock ?? raw.estoque_maximo),
    weightKg: asOptionalNumber(row.weight_net_kg ?? raw.peso_liquido),
    grossWeightKg: asOptionalNumber(row.weight_gross_kg ?? raw.peso_bruto),
    dimensionsCm: {
      width: asOptionalNumber(row.width_cm ?? raw.larguraEmbalagem ?? raw.largura),
      height: asOptionalNumber(row.height_cm ?? raw.alturaEmbalagem ?? raw.altura),
      length: asOptionalNumber(row.length_cm ?? raw.comprimentoEmbalagem ?? raw.comprimento),
    },
    imageUrl:
      row.image_url ??
      firstImageUrl(raw.anexo) ??
      firstImageUrl(raw.anexos) ??
      firstImageUrl(raw.imagem) ??
      firstImageUrl(raw.imagens_externas),
    description: asOptionalString(
      raw.descricao_complementar ??
        raw.obs ??
        raw.shopify_body_text ??
        raw.shopify_catalog_body_text ??
        raw.storefront_description ??
        raw.storefront_catalog_description,
    ),
    slug: asOptionalString(raw.slug),
    videoUrl: asOptionalString(raw.link_video),
    updatedAt: row.synced_at ?? row.updated_at ?? new Date().toISOString(),
  };
};

const mapInputToRow = (input: ProductCacheInput) => {
  const { product, rawPayload, stockPayload } = normalizeInput(input);

  return {
    tiny_id: product.id,
    sku: product.sku || null,
    name: product.name,
    category: product.category,
    ean: product.ean,
    status: product.status,
    unit: product.unit,
    brand: product.brand,
    price: product.price,
    promotional_price: product.promotionalPrice,
    cost_price: product.costPrice,
    stock_quantity: product.stock,
    reserved_stock: product.reservedStock,
    minimum_stock: product.minimumStock,
    maximum_stock: product.maximumStock,
    weight_net_kg: product.weightKg,
    weight_gross_kg: product.grossWeightKg,
    width_cm: product.dimensionsCm.width,
    height_cm: product.dimensionsCm.height,
    length_cm: product.dimensionsCm.length,
    image_url: product.imageUrl,
    raw_payload: rawPayload ?? {},
    stock_payload: stockPayload ?? {},
    synced_at: new Date().toISOString(),
  };
};

type ProductCacheUpsertRow = ReturnType<typeof mapInputToRow>;

const isPresent = (value: unknown) => value !== null && value !== undefined && value !== '';

const preferPresent = <T>(incoming: T, existing: T | null | undefined): T | null =>
  isPresent(incoming) ? incoming : existing ?? null;

const existingNumber = (value: number | string | null | undefined) => asOptionalNumber(value);

const preferNullableNumber = (
  incoming: number | null,
  existing: number | string | null | undefined,
  zeroIsMissing = false,
) => {
  const existingValue = existingNumber(existing);

  if (incoming === null) return existingValue;
  if (zeroIsMissing && incoming === 0 && existingValue !== null && existingValue > 0) return existingValue;
  return incoming;
};

const preferRequiredNumber = (
  incoming: number,
  existing: number | string | null | undefined,
  zeroIsMissing = false,
) => preferNullableNumber(incoming, existing, zeroIsMissing) ?? 0;

const mergePayload = (
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown> | null | undefined,
) => ({
  ...(existing ?? {}),
  ...(incoming ?? {}),
});

const mergeRowWithExisting = (
  row: ProductCacheUpsertRow,
  existing: ProductCacheRow | undefined,
): ProductCacheUpsertRow => {
  if (!existing) return row;

  return {
    ...row,
    sku: preferPresent(row.sku, existing.sku),
    name: row.name || existing.name,
    category: preferPresent(row.category, existing.category),
    ean: preferPresent(row.ean, existing.ean),
    status: preferPresent(row.status, existing.status),
    unit: preferPresent(row.unit, existing.unit),
    brand: preferPresent(row.brand, existing.brand),
    price: preferRequiredNumber(row.price, existing.price, true),
    promotional_price: preferNullableNumber(row.promotional_price, existing.promotional_price, true),
    cost_price: preferNullableNumber(row.cost_price, existing.cost_price, true),
    stock_quantity: row.stock_quantity ?? existingNumber(existing.stock_quantity),
    reserved_stock: row.reserved_stock ?? existingNumber(existing.reserved_stock),
    minimum_stock: row.minimum_stock ?? existingNumber(existing.minimum_stock) ?? 0,
    maximum_stock: row.maximum_stock ?? existingNumber(existing.maximum_stock),
    weight_net_kg: preferNullableNumber(row.weight_net_kg, existing.weight_net_kg, true),
    weight_gross_kg: preferNullableNumber(row.weight_gross_kg, existing.weight_gross_kg, true),
    width_cm: preferNullableNumber(row.width_cm, existing.width_cm, true),
    height_cm: preferNullableNumber(row.height_cm, existing.height_cm, true),
    length_cm: preferNullableNumber(row.length_cm, existing.length_cm, true),
    image_url: preferPresent(row.image_url, existing.image_url),
    raw_payload: mergePayload(existing.raw_payload, row.raw_payload),
    stock_payload: mergePayload(existing.stock_payload, row.stock_payload),
  };
};

export class ProductsCacheService {
  async hasProducts() {
    if (!hasSupabaseConfig || !supabaseAdmin) return false;

    const { count, error } = await supabaseAdmin
      .from('product_cache')
      .select('tiny_id', { count: 'exact', head: true });

    if (error) {
      if (isMissingProductTable(error)) return false;
      logger.warn({ error }, 'Unable to inspect product cache');
      return false;
    }

    return Boolean(count && count > 0);
  }

  async list(filters: ProductCacheFilters = {}): Promise<Product[]> {
    if (!hasSupabaseConfig || !supabaseAdmin) return [];

    const client = supabaseAdmin;
    const buildQuery = () => {
      let query = client.from('product_cache').select('*').order('name', { ascending: true });

      if (filters.search) {
        const search = filters.search.replace(/[%*,]/g, ' ').trim();
        if (search) {
          query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,ean.ilike.%${search}%`);
        }
      }

      if (filters.category) query = query.eq('category', filters.category);
      if (filters.stock === 'out') query = query.lte('stock_quantity', 0);

      return query;
    };

    const rows: ProductCacheRow[] = [];

    for (let from = 0; ; from += supabasePageSize) {
      const { data, error } = await buildQuery().range(from, from + supabasePageSize - 1);

      if (error) {
        if (isMissingProductTable(error)) return [];
        throw error;
      }

      rows.push(...((data ?? []) as ProductCacheRow[]));
      if ((data?.length ?? 0) < supabasePageSize) break;
    }

    const products = rows.map(mapRowToProduct);

    if (filters.stock === 'low') {
      return products.filter(
        (product) => product.stock !== null && product.stock > 0 && product.stock <= product.minimumStock,
      );
    }

    return products;
  }

  async get(id: string): Promise<Product | null> {
    if (!hasSupabaseConfig || !supabaseAdmin) return null;

    const { data, error } = await supabaseAdmin
      .from('product_cache')
      .select('*')
      .or(`tiny_id.eq.${id},sku.eq.${id},ean.eq.${id}`)
      .maybeSingle();

    if (error) {
      if (isMissingProductTable(error)) return null;
      throw error;
    }

    return data ? mapRowToProduct(data as ProductCacheRow) : null;
  }

  async upsertMany(products: ProductCacheInput[]) {
    if (!hasSupabaseConfig || !supabaseAdmin || products.length === 0) {
      return false;
    }

    for (const group of chunk(products, 250)) {
      const rows = group.map(mapInputToRow);
      const { data: existingRows, error: existingError } = await supabaseAdmin
        .from('product_cache')
        .select('*')
        .in(
          'tiny_id',
          rows.map((row) => row.tiny_id),
        );

      if (existingError) {
        if (isMissingProductTable(existingError)) return false;
        throw existingError;
      }

      const existingById = new Map(
        ((existingRows ?? []) as ProductCacheRow[]).map((row) => [row.tiny_id, row]),
      );

      const { error } = await supabaseAdmin
        .from('product_cache')
        .upsert(rows.map((row) => mergeRowWithExisting(row, existingById.get(row.tiny_id))), {
          onConflict: 'tiny_id',
        });

      if (error) {
        if (isMissingProductTable(error)) return false;
        throw error;
      }
    }

    return true;
  }

  async insertMissingSummaries(products: Product[]) {
    if (!hasSupabaseConfig || !supabaseAdmin || products.length === 0) {
      return false;
    }

    for (const group of chunk(products, 500)) {
      const { error } = await supabaseAdmin
        .from('product_cache')
        .upsert(group.map(mapInputToRow), {
          onConflict: 'tiny_id',
          ignoreDuplicates: true,
        });

      if (error) {
        if (isMissingProductTable(error)) return false;
        throw error;
      }
    }

    return true;
  }

  async sync(products: ProductCacheInput[], userId: string | null): Promise<ProductSyncResult> {
    if (!hasSupabaseConfig || !supabaseAdmin) {
      return { persisted: false, runId: null, processed: products.length };
    }

    let runId: string | null = null;

    try {
      const { data: run, error: runError } = await supabaseAdmin
        .from('product_sync_runs')
        .insert({
          status: 'running',
          total_products: products.length,
          processed_products: 0,
          created_by: userId,
        })
        .select('id')
        .single();

      if (runError) {
        if (isMissingProductTable(runError)) {
          logger.warn('Product sync tables are not available yet');
          return { persisted: false, runId: null, processed: products.length };
        }
        throw runError;
      }

      runId = run.id;
      await this.upsertMany(products);

      const { error: finishError } = await supabaseAdmin
        .from('product_sync_runs')
        .update({
          status: 'finished',
          finished_at: new Date().toISOString(),
          processed_products: products.length,
        })
        .eq('id', runId);

      if (finishError) throw finishError;

      return { persisted: true, runId, processed: products.length };
    } catch (error) {
      logger.warn({ error }, 'Unable to persist Tiny product cache');

      if (runId) {
        await supabaseAdmin
          .from('product_sync_runs')
          .update({
            status: 'failed',
            finished_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : 'Unknown sync error',
          })
          .eq('id', runId);
      }

      return { persisted: false, runId, processed: products.length };
    }
  }
}

export const productsCacheService = new ProductsCacheService();
