import { logger } from '../../lib/logger.js';
import type { Order, OrderStatus, Product } from '../../types/domain.js';
import { tinyClient } from './tiny.client.js';

type TinyProduct = {
  id?: string | number;
  data_criacao?: string;
  data_alteracao?: string;
  nome?: string;
  codigo?: string;
  categoria?: string;
  situacao?: string;
  unidade?: string;
  marca?: string;
  localizacao?: string;
  ncm?: string;
  gtin?: string;
  preco?: string | number;
  preco_promocional?: string | number;
  preco_custo?: string | number;
  preco_custo_medio?: string | number;
  saldo?: string | number;
  saldoReservado?: string | number;
  estoque_minimo?: string | number;
  estoque_maximo?: string | number;
  peso_liquido?: string | number;
  peso_bruto?: string | number;
  nome_fornecedor?: string;
  largura?: string | number;
  altura?: string | number;
  comprimento?: string | number;
  larguraEmbalagem?: string | number;
  alturaEmbalagem?: string | number;
  comprimentoEmbalagem?: string | number;
  anexo?: unknown;
  anexos?: unknown;
  imagem?: unknown;
  imagens_externas?: unknown;
  descricao_complementar?: string;
  obs?: string;
  slug?: string;
  link_video?: string;
};

type TinyProductStock = {
  id?: string | number;
  saldo?: string | number;
  saldoReservado?: string | number;
  depositos?: unknown;
};

type TinyProductRecord = {
  produto?: TinyProduct;
};

type TinyProductListResponse = {
  produtos?: TinyProductRecord[];
  numero_paginas?: string | number;
};

type ProductListFilters = {
  search?: string;
  page?: number;
  status?: 'A' | 'I' | 'E';
  createdSince?: string;
};

type TinyOrderRecord = {
  pedido?: {
    id?: string | number;
    numero?: string | number;
    nome?: string;
    situacao?: string;
    valor?: string | number;
    forma_envio?: string;
    data_pedido?: string;
    data_prevista?: string;
  };
};

const maxTinyPages = 200;

const asNumber = (value: unknown, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asOptionalNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  return asNumber(value);
};

const parseTinyDate = (value: unknown) => {
  if (!value) return new Date().toISOString();

  const text = String(value);
  const brDate = text.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/,
  );

  if (brDate) {
    const [, day, month, year, hour = '0', minute = '0', second = '0'] = brDate;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ).toISOString();
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const formatTinyDate = (date: Date) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'America/Sao_Paulo',
  })
    .format(date)
    .replace(',', '');

const formatTinyDay = (date: Date) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(date);

const isEmptyTinyQueue = (error: unknown) =>
  error instanceof Error &&
  error.message
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .includes('consulta nao retornou registros');

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

const normalizeOrderStatus = (status?: string): OrderStatus => {
  const normalized = status?.toLowerCase() ?? '';

  if (normalized.includes('cancel')) return 'cancelled';
  if (normalized.includes('entreg')) return 'delivered';
  if (normalized.includes('envi')) return 'shipped';
  if (normalized.includes('pagamento')) return 'awaiting_payment';
  if (normalized.includes('pago') || normalized.includes('aprov')) return 'paid';
  if (normalized.includes('separ')) return 'awaiting_shipping';

  return 'new';
};

const mapProduct = (record: TinyProductRecord, stock?: TinyProductStock | null): Product => {
  const product = record.produto ?? {};
  const stockValue = stock?.saldo ?? product.saldo;
  const reservedStockValue = stock?.saldoReservado ?? product.saldoReservado;

  return {
    id: String(product.id ?? product.codigo ?? crypto.randomUUID()),
    sku: String(product.codigo ?? ''),
    name: String(product.nome ?? 'Produto sem nome'),
    category: product.categoria ? String(product.categoria) : null,
    ean: product.gtin ? String(product.gtin) : null,
    status: product.situacao ? String(product.situacao) : null,
    unit: product.unidade ? String(product.unidade) : null,
    brand: product.marca ? String(product.marca) : null,
    location: product.localizacao ? String(product.localizacao) : null,
    ncm: product.ncm ? String(product.ncm) : null,
    supplierName: product.nome_fornecedor ? String(product.nome_fornecedor) : null,
    promotionalPrice: asOptionalNumber(product.preco_promocional),
    costPrice: asOptionalNumber(product.preco_custo_medio ?? product.preco_custo),
    price: asNumber(product.preco),
    stock: asOptionalNumber(stockValue),
    reservedStock: asOptionalNumber(reservedStockValue),
    minimumStock: asNumber(product.estoque_minimo),
    maximumStock: asOptionalNumber(product.estoque_maximo),
    weightKg: asOptionalNumber(product.peso_liquido),
    grossWeightKg: asOptionalNumber(product.peso_bruto),
    dimensionsCm: {
      width: asOptionalNumber(product.larguraEmbalagem ?? product.largura),
      height: asOptionalNumber(product.alturaEmbalagem ?? product.altura),
      length: asOptionalNumber(product.comprimentoEmbalagem ?? product.comprimento),
    },
    imageUrl:
      firstImageUrl(product.anexo) ??
      firstImageUrl(product.anexos) ??
      firstImageUrl(product.imagem) ??
      firstImageUrl(product.imagens_externas),
    description: product.descricao_complementar || product.obs ? String(product.descricao_complementar ?? product.obs) : null,
    slug: product.slug ? String(product.slug) : null,
    videoUrl: product.link_video ? String(product.link_video) : null,
    updatedAt: parseTinyDate(product.data_alteracao ?? product.data_criacao),
    sourceUpdatedAt: parseTinyDate(product.data_alteracao ?? product.data_criacao),
    syncedAt: new Date().toISOString(),
  };
};

const mapOrder = (record: TinyOrderRecord): Order => {
  const order = record.pedido ?? {};

  return {
    id: String(order.id ?? order.numero ?? crypto.randomUUID()),
    number: String(order.numero ?? order.id ?? ''),
    customerName: String(order.nome ?? 'Cliente nao informado'),
    status: normalizeOrderStatus(order.situacao),
    total: asNumber(order.valor),
    shippingMethod: String(order.forma_envio ?? 'Nao informado'),
    createdAt: parseTinyDate(order.data_pedido),
    promisedAt: order.data_prevista ? parseTinyDate(order.data_prevista) : null,
    items: [],
  };
};

export class TinyService {
  private async searchProductsPage(filters: ProductListFilters = {}) {
    return tinyClient.post<TinyProductListResponse>('produtos.pesquisa.php', {
      pesquisa: filters.search,
      pagina: filters.page,
      situacao: filters.status,
      dataCriacao: filters.createdSince,
    });
  }

  async listProducts(filters: { search?: string; page?: number } = {}) {
    const result = await this.searchProductsPage(filters);

    return (result.produtos ?? []).map((product) => mapProduct(product));
  }

  async listAllProducts(filters: { search?: string } = {}) {
    const firstPage = await this.searchProductsPage({ search: filters.search, page: 1 });
    const totalPages = Math.min(
      Math.max(Math.trunc(asNumber(firstPage.numero_paginas, 1)), 1),
      maxTinyPages,
    );
    const products = [...(firstPage.produtos ?? [])];

    for (let page = 2; page <= totalPages; page += 1) {
      const result = await this.searchProductsPage({ search: filters.search, page });
      products.push(...(result.produtos ?? []));
    }

    return products.map((product) => mapProduct(product));
  }

  async listRecentlyCreatedProducts(since: Date) {
    let firstPage: TinyProductListResponse;
    try {
      firstPage = await this.searchProductsPage({ createdSince: formatTinyDate(since), page: 1 });
    } catch (error) {
      if (isEmptyTinyQueue(error)) return [];
      throw error;
    }
    const totalPages = Math.min(
      Math.max(Math.trunc(asNumber(firstPage.numero_paginas, 1)), 1),
      maxTinyPages,
    );
    const products = [...(firstPage.produtos ?? [])];

    for (let page = 2; page <= totalPages; page += 1) {
      const result = await this.searchProductsPage({ createdSince: formatTinyDate(since), page });
      products.push(...(result.produtos ?? []));
    }

    return products.map((product) => mapProduct(product));
  }

  private async listQueue(endpoint: string, since: Date) {
    try {
      const result = await tinyClient.post<TinyProductListResponse>(endpoint, {
        dataAlteracao: formatTinyDate(since),
        pagina: 1,
      });

      // Tiny removes queue entries as they are read. Draining one page per run avoids
      // skipping records that move from page 2 to page 1 after the first response.
      return (result.produtos ?? []).map((product) => mapProduct(product));
    } catch (error) {
      if (isEmptyTinyQueue(error)) return [];
      throw error;
    }
  }

  async listChangedProducts(since: Date) {
    return this.listQueue('lista.atualizacoes.produtos', since);
  }

  async listStockUpdates(since: Date) {
    return this.listQueue('lista.atualizacoes.estoque', since);
  }

  async getProductStock(id: string) {
    const result = await tinyClient.post<{ produto?: TinyProductStock }>('produto.obter.estoque.php', {
      id,
    });

    return result.produto ?? null;
  }

  async getProduct(id: string) {
    const result = await this.getProductWithPayload(id);
    return result.product;
  }

  async getProductWithPayload(id: string, options: { includeStock?: boolean } = {}) {
    const result = await tinyClient.post<{ produto?: TinyProduct }>('produto.obter.php', {
      id,
    });

    if (!result.produto) {
      return {
        product: null,
        rawPayload: null,
        stockPayload: null,
      };
    }

    const stock =
      options.includeStock === false
        ? null
        : await this.getProductStock(id).catch((error: unknown) => {
            logger.warn({ error, productId: id }, 'Unable to load Tiny product stock');
            return null;
          });

    return {
      product: mapProduct({ produto: result.produto }, stock),
      rawPayload: result.produto as Record<string, unknown>,
      stockPayload: stock as Record<string, unknown> | null,
    };
  }

  async listOrders(filters: { search?: string; page?: number; days?: number } = {}) {
    const search = filters.search?.trim();
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() - Math.max(filters.days ?? 90, 1));
    const numericSearch = Boolean(search && /^\d+$/.test(search));
    const result = await tinyClient.post<{ pedidos?: TinyOrderRecord[] }>('pedidos.pesquisa.php', {
      numero: numericSearch ? search : undefined,
      cliente: search && !numericSearch ? search : undefined,
      dataInicial: formatTinyDay(startsAt),
      dataFinal: formatTinyDay(new Date()),
      pagina: filters.page,
      sort: 'DESC',
    });

    return (result.pedidos ?? [])
      .map(mapOrder)
      .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());
  }

  async getOrder(id: string) {
    const result = await tinyClient.post<{ pedido?: TinyOrderRecord['pedido'] }>('pedido.obter.php', {
      id,
    });

    return result.pedido ? mapOrder({ pedido: result.pedido }) : null;
  }

  async listCategories() {
    const result = await tinyClient.post<{ categorias?: Array<{ categoria?: { descricao?: string } }> }>(
      'categorias.pesquisa.php',
    );

    return (result.categorias ?? [])
      .map((item) => item.categoria?.descricao)
      .filter((category): category is string => Boolean(category));
  }

  async listCustomers(search?: string) {
    const result = await tinyClient.post<{ contatos?: Array<{ contato?: { id?: string; nome?: string } }> }>(
      'contatos.pesquisa.php',
      { pesquisa: search },
    );

    return result.contatos ?? [];
  }
}

export const tinyService = new TinyService();
