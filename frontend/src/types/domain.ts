export type ApiStatus = 'online' | 'degraded' | 'offline';
export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';
export type UserRole = 'owner' | 'admin' | 'manager' | 'operator' | 'viewer';
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
  status: string | null;
  unit: string | null;
  brand: string | null;
  location: string | null;
  ncm: string | null;
  supplierName: string | null;
  promotionalPrice: number | null;
  costPrice: number | null;
  price: number;
  stock: number | null;
  reservedStock: number | null;
  minimumStock: number;
  maximumStock: number | null;
  weightKg: number | null;
  grossWeightKg: number | null;
  dimensionsCm: { width: number | null; height: number | null; length: number | null };
  imageUrl: string | null;
  description: string | null;
  slug: string | null;
  videoUrl: string | null;
  updatedAt: string;
  sourceUpdatedAt?: string | null;
  syncedAt?: string;
};

export type ProductCatalogSummary = {
  total: number;
  withImage: number;
  withStock: number;
  lowStock: number;
  outOfStock: number;
  lastSyncAt: string | null;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
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
  latestOrder: Order | null;
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

export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: 'active' | 'inactive';
};

export type LogisticsOccurrence = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  status: OrderStatus;
  shippingMethod: string;
  promisedAt: string | null;
  risk: 'low' | 'medium' | 'critical';
};

export type UserPreferences = {
  theme: 'light' | 'dark' | 'system';
  lowStockThreshold: number;
  favoritePages: string[];
};
