import type { UserRole } from "@/types/auth";

// TYPES

/**
 * Available permission actions across the system
 */
export type PermissionAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "manage"
  | "invite";

/**
 * Permission object defining access to a resource
 */
export interface Permission {
  resource: string;
  action: PermissionAction;
}

// ============================================================================
// ROLE PERMISSIONS MATRIX
// ============================================================================

/**
 * Role-Based Access Control (RBAC) permissions matrix
 *
 * Defines granular permissions for each role in the system.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  USER: [
    { resource: "products", action: "read" },
    { resource: "shops", action: "read" },
    { resource: "map", action: "read" },
    { resource: "profile", action: "read" },
    { resource: "profile", action: "update" },
    { resource: "orders", action: "read" },
    { resource: "cart", action: "manage" },
  ],

  SELLER: [
    { resource: "products", action: "create" },
    { resource: "products", action: "read" },
    { resource: "products", action: "update" },
    { resource: "products", action: "delete" },
    { resource: "profile", action: "read" },
    { resource: "profile", action: "update" },
    { resource: "shop", action: "read" },
    { resource: "shop", action: "update" },
    { resource: "orders", action: "read" },
    { resource: "orders", action: "update" },
    { resource: "analytics", action: "read" },
  ],

  MALL_OWNER: [
    { resource: "sellers", action: "create" },
    { resource: "sellers", action: "read" },
    { resource: "sellers", action: "update" },
    { resource: "sellers", action: "delete" },
    { resource: "sellers", action: "invite" },
    { resource: "shops", action: "create" },
    { resource: "shops", action: "read" },
    { resource: "shops", action: "update" },
    { resource: "shops", action: "delete" },
    { resource: "maps", action: "create" },
    { resource: "maps", action: "read" },
    { resource: "maps", action: "update" },
    { resource: "maps", action: "delete" },
    { resource: "products", action: "read" },
    { resource: "analytics", action: "read" },
    { resource: "users", action: "read" },
    { resource: "system", action: "manage" },
  ],
};

// ============================================================================
// PERMISSION CHECKERS
// ============================================================================

export function hasPermission(
  role: UserRole,
  resource: string,
  action: PermissionAction
): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions
    ? permissions.some((p) => p.resource === resource && p.action === action)
    : false;
}

export function canAccess(
  role: UserRole,
  resource: string,
  action: PermissionAction
): boolean {
  return hasPermission(role, resource, action);
}

export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasResourceAccess(role: UserRole, resource: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.some((p) => p.resource === resource) : false;
}

export function checkOwnership(
  userId: string,
  resourceOwnerId: string
): boolean {
  return userId === resourceOwnerId;
}
