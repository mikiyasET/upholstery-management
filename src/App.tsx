import { useEffect, lazy, Suspense } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { Center, Loader } from "@mantine/core";

import { AppLayout } from "./components/layout";

// Lazy load pages for code splitting & minimal initial bundle
const Login = lazy(() => import("./pages/Login"));
const Materials = lazy(() => import("./pages/Materials"));
const Services = lazy(() => import("./pages/Services"));
const Cars = lazy(() => import("./pages/Cars"));
const Storage = lazy(() => import("./pages/Storage"));
const Customers = lazy(() => import("./pages/Customers"));
const CustomerDetail = lazy(() => import("./pages/CustomerDetail"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const CreateOrder = lazy(() => import("./pages/CreateOrder"));
const Receipt = lazy(() => import("./pages/Receipt"));
const DirectSales = lazy(() => import("./pages/DirectSales"));
const DirectSalesHistory = lazy(() => import("./pages/DirectSalesHistory"));
const Reports = lazy(() => import("./pages/Reports"));
const Users = lazy(() => import("./pages/Users"));
const Assets = lazy(() => import("./pages/Assets"));
const LowStockAlerts = lazy(() => import("./pages/LowStockAlerts"));
const StockHistory = lazy(() => import("./pages/StockHistory"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings = lazy(() => import("./pages/Settings"));

import type { ReactNode } from "react";
import type { PermissionKey } from "./lib/permissions";
import { usePermission } from "./lib/permissions";

const PageFallback = () => (
  <Center h={400} w="100%">
    <Loader color="amber" size="md" />
  </Center>
);

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
const PermissionRoute = ({ permission, children }: { permission: PermissionKey; children: ReactNode }) => {
  const allowed = usePermission(permission);
  if (!allowed) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
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
              <PermissionRoute permission="storage.view">
                <Storage />
              </PermissionRoute>
            }
          />
          <Route
            path="storage/low-stock"
            element={
              <PermissionRoute permission="storage.view">
                <LowStockAlerts />
              </PermissionRoute>
            }
          />
          <Route
            path="storage/history"
            element={
              <PermissionRoute permission="storage.view">
                <StockHistory />
              </PermissionRoute>
            }
          />
          <Route
            path="stock-history"
            element={
              <PermissionRoute permission="storage.view">
                <StockHistory />
              </PermissionRoute>
            }
          />
          <Route
            path="orders"
            element={
              <PermissionRoute permission="orders.view">
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
          <Route path="settings" element={<Settings />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
