import { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/Login';
import Materials from './pages/Materials';
import Services from './pages/Services';
import Cars from './pages/Cars';
import Storage from './pages/Storage';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import CreateOrder from './pages/CreateOrder';
import Receipt from './pages/Receipt';
import DirectSales from './pages/DirectSales';
import DirectSalesHistory from './pages/DirectSalesHistory';
import Reports from './pages/Reports';
import Users from './pages/Users';
import LowStockAlerts from './pages/LowStockAlerts';
import NetworkOverlay from './components/NetworkOverlay';
import Dashboard from './pages/Dashboard';

import type { ReactNode } from 'react';
import type { PermissionKey } from './lib/permissions';
import { usePermission } from './lib/permissions';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: location } });
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
    <>
      <NetworkOverlay />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="materials" element={<PermissionRoute permission="catalog.materials.view"><Materials /></PermissionRoute>} />
          <Route path="services" element={<PermissionRoute permission="catalog.services.view"><Services /></PermissionRoute>} />
          <Route path="cars" element={<PermissionRoute permission="catalog.cars.view"><Cars /></PermissionRoute>} />
          <Route path="storage" element={<PermissionRoute permission="storage.view"><Storage /></PermissionRoute>} />
          <Route path="storage/low-stock" element={<PermissionRoute permission="storage.view"><LowStockAlerts /></PermissionRoute>} />
          <Route path="orders" element={<PermissionRoute permission="orders.view"><Orders /></PermissionRoute>} />
          <Route path="orders/new" element={<PermissionRoute permission="orders.create"><CreateOrder /></PermissionRoute>} />
          <Route path="orders/:id" element={<PermissionRoute permission="orders.view"><OrderDetail /></PermissionRoute>} />
          <Route path="orders/:id/receipt" element={<PermissionRoute permission="orders.view"><Receipt /></PermissionRoute>} />
          <Route path="direct-sales" element={<PermissionRoute permission="directSales.view"><DirectSales /></PermissionRoute>} />
          <Route path="direct-sales/history" element={<PermissionRoute permission="directSales.history"><DirectSalesHistory /></PermissionRoute>} />
          <Route path="customers" element={<PermissionRoute permission="customers.view"><Customers /></PermissionRoute>} />
          <Route path="customers/:id" element={<PermissionRoute permission="customers.view"><CustomerDetail /></PermissionRoute>} />
          <Route path="reports" element={<PermissionRoute permission="reports.view"><Reports /></PermissionRoute>} />
          <Route path="users" element={<PermissionRoute permission="users.view"><Users /></PermissionRoute>} />

          {/* Placeholder Routes */}
          <Route path="settings" element={<div>Settings</div>} />
        </Route>
      </Routes>
    </>
  );
}
