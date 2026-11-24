import { lazyWithRetry } from './lazyWithRetry';

export const DashboardPage = lazyWithRetry(() => import('../pages/Dashboard'));
export const OrdersPage = lazyWithRetry(() => import('../pages/Orders'));
export const CreateOrderPage = lazyWithRetry(() => import('../pages/CreateOrder'));
export const OrderDetailPage = lazyWithRetry(() => import('../pages/OrderDetail'));
export const DirectSalesPage = lazyWithRetry(() => import('../pages/DirectSales'));
export const DirectSalesHistoryPage = lazyWithRetry(() => import('../pages/DirectSalesHistory'));
export const CustomersPage = lazyWithRetry(() => import('../pages/Customers'));
export const CustomerDetailPage = lazyWithRetry(() => import('../pages/CustomerDetail'));
export const MaterialsPage = lazyWithRetry(() => import('../pages/Materials'));
export const ServicesPage = lazyWithRetry(() => import('../pages/Services'));
export const CarsPage = lazyWithRetry(() => import('../pages/Cars'));
export const StoragePage = lazyWithRetry(() => import('../pages/Storage'));
export const LowStockAlertsPage = lazyWithRetry(() => import('../pages/LowStockAlerts'));
export const StockHistoryPage = lazyWithRetry(() => import('../pages/StockHistory'));
export const ReportsPage = lazyWithRetry(() => import('../pages/Reports'));
export const DailyWorkloadPage = lazyWithRetry(() => import('../pages/DailyWorkload'));
export const UsersPage = lazyWithRetry(() => import('../pages/Users'));
export const AssetsPage = lazyWithRetry(() => import('../pages/Assets'));
export const SettingsPage = lazyWithRetry(() => import('../pages/Settings'));
export const ReceiptPage = lazyWithRetry(() => import('../pages/Receipt'));
export const LoginPage = lazyWithRetry(() => import('../pages/Login'));

/**
 * Route path to preload function map.
 * Used for preloading lazy chunks on hover/touch before navigation clicks.
 */
export const routePreloaders: Record<string, () => Promise<unknown>> = {
  '/': () => DashboardPage.preload(),
  '/orders': () => OrdersPage.preload(),
  '/orders/new': () => CreateOrderPage.preload(),
  '/direct-sales': () => DirectSalesPage.preload(),
  '/direct-sales/history': () => DirectSalesHistoryPage.preload(),
  '/customers': () => CustomersPage.preload(),
  '/materials': () => MaterialsPage.preload(),
  '/services': () => ServicesPage.preload(),
  '/cars': () => CarsPage.preload(),
  '/storage': () => StoragePage.preload(),
  '/storage/low-stock': () => LowStockAlertsPage.preload(),
  '/storage/history': () => StockHistoryPage.preload(),
  '/stock-history': () => StockHistoryPage.preload(),
  '/reports': () => ReportsPage.preload(),
  '/daily-workload': () => DailyWorkloadPage.preload(),
  '/users': () => UsersPage.preload(),
  '/assets': () => AssetsPage.preload(),
  '/settings': () => SettingsPage.preload(),
};

export function preloadRoute(path: string) {
  const preloader = routePreloaders[path];
  if (preloader) {
    try {
      preloader().catch(() => {
        // Silently swallow background prefetch errors; normal navigation will retry
      });
    } catch {
      // Ignore synchronous exceptions
    }
  }
}
