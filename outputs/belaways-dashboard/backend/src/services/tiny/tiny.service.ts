import { env } from '../../config/env.js';
import { seedOrders, seedProducts } from '../../constants/seed-data.js';
import type { Order, OrderStatus, Product } from '../../types/domain.js';
import { tinyClient } from './tiny.client.js';

type TinyProductRecord = {
  produto?: {
    id?: string | number;
    codigo?: string;
    nome?: string;
    categoria?: string;
    gtin?: string;
    preco?: string | number;
    saldo?: string | number;
    estoque_minimo?: string | number;
    peso_liquido?: string | number;
    largura?: string | number;
    altura?: string | number;
    comprimento?: string | number;
    anexo?: string;
    data_alteracao?: string;
  };
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

const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
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

const mapProduct = (record: TinyProductRecord): Product => {
  const product = record.produto ?? {};

  return {
    id: String(product.id ?? product.codigo ?? crypto.randomUUID()),
    sku: String(product.codigo ?? ''),
    name: String(product.nome ?? 'Produto sem nome'),
    category: product.categoria ? String(product.categoria) : null,
    ean: product.gtin ? String(product.gtin) : null,
    price: asNumber(product.preco),
    stock: asNumber(product.saldo),
    reservedStock: 0,
    minimumStock: asNumber(product.estoque_minimo, 5),
    weightKg: product.peso_liquido ? asNumber(product.peso_liquido) : null,
    dimensionsCm: {
      width: product.largura ? asNumber(product.largura) : null,
      height: product.altura ? asNumber(product.altura) : null,
      length: product.comprimento ? asNumber(product.comprimento) : null,
    },
    imageUrl: product.anexo ? String(product.anexo) : null,
    updatedAt: product.data_alteracao ? new Date(product.data_alteracao).toISOString() : new Date().toISOString(),
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
    createdAt: order.data_pedido ? new Date(order.data_pedido).toISOString() : new Date().toISOString(),
    promisedAt: order.data_prevista ? new Date(order.data_prevista).toISOString() : null,
    items: [],
  };
};

export class TinyService {
  async listProducts(filters: { search?: string; page?: number } = {}) {
    if (env.isDevelopment && !env.tinyApiKey) {
      return seedProducts.filter((product) =>
        filters.search ? product.name.toLowerCase().includes(filters.search.toLowerCase()) : true,
      );
    }

    const result = await tinyClient.post<{ produtos?: TinyProductRecord[] }>('produtos.pesquisa.php', {
      pesquisa: filters.search,
      pagina: filters.page,
    });

    return (result.produtos ?? []).map(mapProduct);
  }

  async getProduct(id: string) {
    if (env.isDevelopment && !env.tinyApiKey) {
      return seedProducts.find((product) => product.id === id || product.sku === id) ?? null;
    }

    const result = await tinyClient.post<{ produto?: TinyProductRecord['produto'] }>('produto.obter.php', {
      id,
    });

    return result.produto ? mapProduct({ produto: result.produto }) : null;
  }

  async listOrders(filters: { search?: string; page?: number } = {}) {
    if (env.isDevelopment && !env.tinyApiKey) {
      return seedOrders.filter((order) => {
        const text = `${order.number} ${order.customerName}`.toLowerCase();
        return filters.search ? text.includes(filters.search.toLowerCase()) : true;
      });
    }

    const result = await tinyClient.post<{ pedidos?: TinyOrderRecord[] }>('pedidos.pesquisa.php', {
      pesquisa: filters.search,
      pagina: filters.page,
    });

    return (result.pedidos ?? []).map(mapOrder);
  }

  async getOrder(id: string) {
    if (env.isDevelopment && !env.tinyApiKey) {
      return seedOrders.find((order) => order.id === id || order.number === id) ?? null;
    }

    const result = await tinyClient.post<{ pedido?: TinyOrderRecord['pedido'] }>('pedido.obter.php', {
      id,
    });

    return result.pedido ? mapOrder({ pedido: result.pedido }) : null;
  }

  async listCategories() {
    if (env.isDevelopment && !env.tinyApiKey) {
      return [...new Set(seedProducts.map((product) => product.category ?? 'Sem categoria'))];
    }

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
