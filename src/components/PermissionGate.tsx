import { type ReactNode } from 'react';
import { usePermission, type PermissionKey } from '../lib/permissions';

interface PermissionGateProps {
  /** The permission key to check */
  permission: PermissionKey;
  /** Content to render if the user HAS the permission */
  children: ReactNode;
  /** Optional fallback when permission is denied (defaults to nothing) */
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on whether the current user 
 * has the specified permission. ADMINs always pass.
 */
export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const allowed = usePermission(permission);
  return <>{allowed ? children : fallback}</>;
}
