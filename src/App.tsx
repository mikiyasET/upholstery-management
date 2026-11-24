import { useEffect, Suspense } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";

import { AppLayout } from "./components/layout";
import { PageLoadingFallback } from "./components/common";
import {
  DashboardPage as Dashboard,
  OrdersPage as Orders,
  CreateOrderPage as CreateOrder,
  OrderDetailPage as OrderDetail,
  DirectSalesPage as DirectSales,
  DirectSalesHistoryPage as DirectSalesHistory,
  CustomersPage as Customers,
  CustomerDetailPage as CustomerDetail,
  MaterialsPage as Materials,
  ServicesPage as Services,
  CarsPage as Cars,
  StoragePage as Storage,
  LowStockAlertsPage as LowStockAlerts,
  StockHistoryPage as StockHistory,
  ReportsPage as Reports,
  DailyWorkloadPage as DailyWorkload,
  UsersPage as Users,
  AssetsPage as Assets,
  SettingsPage as Settings,
  ReceiptPage as Receipt,
  LoginPage as Login,
} from "./lib/routePreloader";

import type { ReactNode } from "react";
import type { PermissionKey } from "./lib/permissions";
import { checkPermission } from "./lib/permissions";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: location } });
    }
  }, [user, navigate, location]);

  if (!user) return null;

  return <>{children}</>;
};

/** Route guard that checks a specific permission. Redirects to / if denied. */
const PermissionRoute = ({ permission, children }: { permission: PermissionKey | PermissionKey[]; children: ReactNode }) => {
  const user = useAuthStore((s) => s.user);
  const keys = Array.isArray(permission) ? permission : [permission];
  const allowed = keys.some((k) => checkPermission(user?.permissions, user?.role || "", k));
  if (!allowed) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route
            path="materials"
            element={
              <PermissionRoute permission="catalog.materials.view">
                <Materials />
              </PermissionRoute>
            }
          />
          <Route
            path="services"
            element={
              <PermissionRoute permission="catalog.services.view">
                <Services />
              </PermissionRoute>
            }
          />
          <Route
            path="cars"
            element={
              <PermissionRoute permission="catalog.cars.view">
                <Cars />
              </PermissionRoute>
            }
          />
          <Route
            path="storage"
            element={
              <PermissionRoute permission={["storage.view", "storage.restock", "storage.transfer", "storage.adjust", "storage.count", "storage.allocate", "storage.edit"]}>
                <Storage />
              </PermissionRoute>
            }
          />
          <Route
            path="storage/low-stock"
            element={
              <PermissionRoute permission={["storage.lowStock", "storage.view"]}>
                <LowStockAlerts />
              </PermissionRoute>
            }
          />
          <Route
            path="storage/history"
            element={
              <PermissionRoute permission={["storage.history", "storage.view"]}>
                <StockHistory />
              </PermissionRoute>
            }
          />
          <Route
            path="stock-history"
            element={
              <PermissionRoute permission={["storage.history", "storage.view"]}>
                <StockHistory />
              </PermissionRoute>
            }
          />
          <Route
            path="orders"
            element={
              <PermissionRoute permission={["orders.view", "orders.create", "orders.status", "orders.edit"]}>
                <Orders />
              </PermissionRoute>
            }
          />
          <Route
            path="orders/new"
            element={
              <PermissionRoute permission="orders.create">
                <CreateOrder />
              </PermissionRoute>
            }
          />
          <Route
            path="orders/:id"
            element={
              <PermissionRoute permission="orders.view">
                <OrderDetail />
              </PermissionRoute>
            }
          />
          <Route
            path="orders/:id/receipt"
            element={
              <PermissionRoute permission="orders.view">
                <Receipt />
              </PermissionRoute>
            }
          />
          <Route
            path="direct-sales"
            element={
              <PermissionRoute permission="directSales.view">
                <DirectSales />
              </PermissionRoute>
            }
          />
          <Route
            path="direct-sales/history"
            element={
              <PermissionRoute permission="directSales.history">
                <DirectSalesHistory />
              </PermissionRoute>
            }
          />
          <Route
            path="customers"
            element={
              <PermissionRoute permission="customers.view">
                <Customers />
              </PermissionRoute>
            }
          />
          <Route
            path="customers/:id"
            element={
              <PermissionRoute permission="customers.view">
                <CustomerDetail />
              </PermissionRoute>
            }
          />
          <Route
            path="reports"
            element={
              <PermissionRoute permission="reports.view">
                <Reports />
              </PermissionRoute>
            }
          />
          <Route
            path="daily-workload"
            element={
              <PermissionRoute permission={["reports.view", "orders.view"]}>
                <DailyWorkload />
              </PermissionRoute>
            }
          />
          <Route
            path="users"
            element={
              <PermissionRoute permission="users.view">
                <Users />
              </PermissionRoute>
            }
          />
          <Route
            path="assets"
            element={
              <PermissionRoute permission="assets.view">
                <Assets />
              </PermissionRoute>
            }
          />
          <Route
            path="settings"
            element={
              <PermissionRoute permission="settings.view">
                <Settings />
              </PermissionRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
