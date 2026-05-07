// src/lib/auth/index.ts
// Barrel export for authentication utilities

// Password utilities
export { hashPassword, verifyPassword, isPasswordStrong } from "./password";

// Token utilities
export {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateVerificationToken,
  generateTokenFamily,
  generateSessionToken,
} from "./tokens";

// Session management
export {
  createSession,
  getSession,
  deleteSession,
  deleteUserSessions,
  cleanupExpiredSessions,
  extendSession,
  updateSessionActivity,
} from "./session";

// Email verification tokens
export {
  createEmailVerificationToken,
  verifyEmailToken,
  createPasswordResetToken,
  verifyPasswordResetToken,
  createMagicLinkToken,
  verifyMagicLinkToken,
  getTokenStats,
  cleanupExpiredTokens,
} from "./email";

// RBAC utilities
export {
  hasPermission,
  canAccess,
  getRolePermissions,
  hasResourceAccess,
  checkOwnership,
  ROLE_PERMISSIONS,
  type Permission,
  type PermissionAction,
} from "./rbac";

// Ownership checks
export {
  requireProductOwnership,
  requireShopOwnership,
  requireGenericOwnership,
  checkResourceOwnership,
} from "./ownership";
