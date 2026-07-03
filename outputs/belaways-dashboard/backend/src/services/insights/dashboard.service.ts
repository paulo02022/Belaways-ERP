import { seedDashboard } from '../../constants/seed-data.js';
import type { DashboardOverview, Order, Product } from '../../types/domain.js';
import { alertsService } from './alerts.service.js';

const daysBetween = (date: Date, compareTo = new Date()) =>
  Math.floor((compareTo.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));

const countOrdersSince = (orders: Order[], days: number) =>
  orders.filter((order) => daysBetween(new Date(order.createdAt)) < days).length;

export class DashboardService {
  build(products: Product[], orders: Order[], apiStatus: DashboardOverview['apiStatus']): DashboardOverview {
    if (products.length === 0 && orders.length === 0) {
      return {
        ...seedDashboard,
        apiStatus,
        lastSyncAt: new Date().toISOString(),
      };
    }

    const alerts = alertsService.generate(products, orders);
    const categoryMap = new Map<string, number>();
    const statusMap = new Map<string, number>();

    products.forEach((product) => {
      const category = product.category ?? 'Sem categoria';
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + product.stock);
    });

    orders.forEach((order) => {
      statusMap.set(order.status, (statusMap.get(order.status) ?? 0) + 1);
    });

    return {
      metrics: {
        totalProducts: products.length,
        ordersToday: countOrdersSince(orders, 1),
        ordersWeek: countOrdersSince(orders, 7),
        ordersMonth: countOrdersSince(orders, 30),
        outOfStockProducts: products.filter((product) => product.stock <= 0).length,
        lowStockProducts: products.filter(
          (product) => product.stock > 0 && product.stock <= product.minimumStock,
        ).length,
        delayedOrders: orders.filter((order) => order.status === 'delayed').length,
        openAlerts: alerts.length,
        inconsistencies: alerts.filter((alert) => alert.source === 'product').length,
      },
      lastSyncAt: new Date().toISOString(),
      apiStatus,
      salesTrend: seedDashboard.salesTrend,
      stockByCategory: Array.from(categoryMap.entries()).map(([category, estoque]) => ({
        category,
        estoque,
      })),
      ordersByStatus: Array.from(statusMap.entries()).map(([status, quantidade]) => ({
        status,
        quantidade,
      })),
    };
  }
}

export const dashboardService = new DashboardService();
