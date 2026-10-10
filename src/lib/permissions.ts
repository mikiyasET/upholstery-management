import { useAuthStore, type UserPermissions } from '../store/authStore';

// Permission key type — mirrors backend
export type PermissionKey =
  | 'dashboard.view'
  | 'orders.view'
  | 'orders.create'
  | 'directSales.view'
  | 'directSales.create'
  | 'directSales.history'
  | 'customers.view'
  | 'customers.edit'
  | 'storage.view'
  | 'storage.edit'
  | 'catalog.materials.view'
  | 'catalog.materials.add'
  | 'catalog.materials.edit'
  | 'catalog.materials.remove'
  | 'catalog.services.view'
  | 'catalog.services.add'
  | 'catalog.services.edit'
  | 'catalog.services.remove'
  | 'catalog.cars.view'
  | 'catalog.cars.add'
  | 'catalog.cars.edit'
  | 'catalog.cars.remove'
  | 'users.view'
  | 'users.edit'
  | 'reports.view';

/**
 * Hook: check if the current user has a given permission.
 * ADMINs always return true.
 */
export function usePermission(key: PermissionKey): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (!user.permissions) return false;
  return user.permissions[key] === true;
}

/**
 * Hook: check multiple permissions at once (AND logic).
 */
export function usePermissions(...keys: PermissionKey[]): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (!user.permissions) return false;
  return keys.every((key) => user.permissions![key] === true);
}

/**
 * Non-hook utility for checking permission outside components.
 */
export function checkPermission(permissions: UserPermissions | null | undefined, role: string, key: PermissionKey): boolean {
  if (role === 'ADMIN') return true;
  if (!permissions) return false;
  return permissions[key] === true;
}
