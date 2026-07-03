export type ApiStatus = 'online' | 'degraded' | 'offline';
export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';
export type OrderStatus =
  | 'new'
  | 'awaiting_payment'
  | 'paid'
  | 'awaiting_shipping'
  | 'shipped'
  | 'delivered'
  | 'delayed'
  | 'cancelled';

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  ean: string | null;
  price: number;
  stock: number;
  reservedStock: number;
  minimumStock: number;
  weightKg: number | null;
  dimensionsCm: {
    width: number | null;
    height: number | null;
    length: number | null;
  };
  imageUrl: string | null;
  updatedAt: string;
};

export type Order = {
  id: string;
  number: string;
  customerName: string;
  status: OrderStatus;
  total: number;
  shippingMethod: string;
  createdAt: string;
  promisedAt: string | null;
  items: Array<{
    productId: string;
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
};

export type Alert = {
  id: string;
  title: string;
  description: string;
  priority: AlertPriority;
  status: AlertStatus;
  source: 'product' | 'order' | 'integration' | 'audit';
  entityId: string | null;
  entityLabel: string | null;
  createdAt: string;
};

export type DashboardOverview = {
  metrics: {
    totalProducts: number;
    ordersToday: number;
    ordersWeek: number;
    ordersMonth: number;
    outOfStockProducts: number;
    lowStockProducts: number;
    delayedOrders: number;
    openAlerts: number;
    inconsistencies: number;
  };
  lastSyncAt: string;
  apiStatus: ApiStatus;
  salesTrend: Array<{ label: string; pedidos: number; receita: number }>;
  stockByCategory: Array<{ category: string; estoque: number }>;
  ordersByStatus: Array<{ status: string; quantidade: number }>;
};

export type AuditLog = {
  id: string;
  userId: string;
  userEmail: string;
  ipAddress: string;
  action: string;
  description: string;
  productId: string | null;
  orderId: string | null;
  result: 'success' | 'failure';
  createdAt: string;
};
