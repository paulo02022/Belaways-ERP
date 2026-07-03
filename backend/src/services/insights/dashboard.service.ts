import type { DashboardOverview, Order, Product } from '../../types/domain.js';
import { alertsService } from './alerts.service.js';

const daysBetween = (date: Date, compareTo = new Date()) =>
  Math.floor((compareTo.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));

const countOrdersSince = (orders: Order[], days: number) =>
  orders.filter((order) => daysBetween(new Date(order.createdAt)) < days).length;

const buildSalesTrend = (orders: Order[]) => {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });

  return days.map((date) => {
    const key = date.toISOString().slice(0, 10);
    const ordersOnDate = orders.filter((order) => order.createdAt.slice(0, 10) === key);

    return {
      label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      pedidos: ordersOnDate.length,
      receita: ordersOnDate.reduce((sum, order) => sum + order.total, 0),
    };
  });
};

export class DashboardService {
  build(products: Product[], orders: Order[], apiStatus: DashboardOverview['apiStatus']): DashboardOverview {
    const alerts = alertsService.generate(products, orders);
    const categoryMap = new Map<string, number>();
    const statusMap = new Map<string, number>();

    products.forEach((product) => {
      const category = product.category ?? 'Sem categoria';
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + (product.stock ?? 0));
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
        outOfStockProducts: products.filter((product) => product.stock !== null && product.stock <= 0).length,
        lowStockProducts: products.filter(
          (product) => product.stock !== null && product.stock > 0 && product.stock <= product.minimumStock,
        ).length,
        delayedOrders: orders.filter((order) => order.status === 'delayed').length,
        openAlerts: alerts.length,
        inconsistencies: alerts.filter((alert) => alert.source === 'product').length,
      },
      lastSyncAt: new Date().toISOString(),
      apiStatus,
      salesTrend: buildSalesTrend(orders),
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
