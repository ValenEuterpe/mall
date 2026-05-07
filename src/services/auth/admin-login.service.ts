// src/lib/services/auth/admin-login.service.ts

import prisma from "@/lib/db/prisma";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import { maskEmail } from "@/lib/utils/email";
import { logger } from "@/lib/utils/logger";
import type {
  UnifiedAccount,
  AdminPortalRole,
  LoginErrorCode,
} from "@/types/auth";

const config = AUTH_CONFIG.login;

// ============================================================================
// ACCOUNT LOOKUP
// ============================================================================

/**
 * Find account by email. Searches Seller first, then MallOwner.
 */
export async function findAdminAccountByEmail(
  email: string
): Promise<UnifiedAccount | null> {
  const seller = await prisma.seller.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      isActive: true,
      isVerified: true,
      businessName: true,
      failedLoginAttempts: true,
      lockedUntil: true,
    },
  });

  if (seller) {
    return {
      id: seller.id,
      email: seller.email,
      password: seller.password ?? "",
      isActive: seller.isActive,
      status: seller.isVerified ? "VERIFIED" : "PENDING",
      displayName: seller.businessName ?? "New Seller",
      failedLoginAttempts: seller.failedLoginAttempts,
      lockedUntil: seller.lockedUntil,
      role: "SELLER",
    };
  }

  const mallOwner = await prisma.mallOwner.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      name: true,
      failedLoginAttempts: true,
      lockedUntil: true,
    },
  });

  if (mallOwner) {
    return {
      id: mallOwner.id,
      email: mallOwner.email,
      password: mallOwner.password,
      isActive: true,
      status: "VERIFIED",
      displayName: mallOwner.name,
      failedLoginAttempts: mallOwner.failedLoginAttempts,
      lockedUntil: mallOwner.lockedUntil,
      role: "MALL_OWNER",
    };
  }

  return null;
}

// ============================================================================
// ACCOUNT STATUS
// ============================================================================

export interface AccountStatusError {
  valid: false;
  code: LoginErrorCode;
  message: string;
  status: number;
  retryAfter?: number;
}

export interface AccountStatusValid {
  valid: true;
}

export type AccountStatusResult = AccountStatusValid | AccountStatusError;

/**
 * Check account status and return appropriate error if not active
 */
export function checkAccountStatus(
  account: UnifiedAccount
): AccountStatusResult {
  // Check if account is locked
  if (account.lockedUntil && account.lockedUntil > new Date()) {
    const retryAfter = Math.ceil(
      (account.lockedUntil.getTime() - Date.now()) / 1000
    );
    return {
      valid: false,
      code: "ACCOUNT_LOCKED",
      message:
        "Account is temporarily locked due to too many failed login attempts",
      status: 429,
      retryAfter,
    };
  }

  // Check if account is active
  if (!account.isActive) {
    return {
      valid: false,
      code: "ACCOUNT_DISABLED",
      message: "Your account has been disabled. Please contact support.",
      status: 403,
    };
  }

  // Check account status (for pending invitations, etc.)
  if (account.status === "PENDING") {
    return {
      valid: false,
      code: "ACCOUNT_PENDING",
      message:
        "Your account is pending approval. Please wait for confirmation.",
      status: 403,
    };
  }

  if (account.status === "SUSPENDED") {
    return {
      valid: false,
      code: "ACCOUNT_DISABLED",
      message: "Your account has been suspended. Please contact support.",
      status: 403,
    };
  }

  return { valid: true };
}

// ============================================================================
// FAILED ATTEMPTS MANAGEMENT
// ============================================================================

/**
 * Update failed login attempts for an account
 */
export async function updateFailedAttempts(
  account: UnifiedAccount,
  newAttempts: number,
  shouldLock: boolean
): Promise<void> {
  const updateData = {
    failedLoginAttempts: newAttempts,
    ...(shouldLock && {
      lockedUntil: new Date(
        Date.now() + config.lockoutDurationMinutes * 60 * 1000
      ),
    }),
  };

  if (account.role === "SELLER") {
    await prisma.seller.update({
      where: { id: account.id },
      data: updateData,
    });
  } else if (account.role === "MALL_OWNER") {
    await prisma.mallOwner.update({
      where: { id: account.id },
      data: updateData,
    });
  }
}

/**
 * Handle failed password attempt
 * Returns true if account should be locked
 */
export async function handleFailedPasswordAttempt(
  account: UnifiedAccount
): Promise<{ shouldLock: boolean; newAttempts: number }> {
  if (!config.trackFailedAttempts) {
    return { shouldLock: false, newAttempts: 0 };
  }

  const newAttempts = (account.failedLoginAttempts ?? 0) + 1;
  const shouldLock = newAttempts >= config.maxFailedAttempts;

  await updateFailedAttempts(account, newAttempts, shouldLock);

  return { shouldLock, newAttempts };
}

// ============================================================================
// LOGIN METADATA
// ============================================================================

/**
 * Update login metadata after successful login
 */
export async function updateLoginMetadata(
  account: UnifiedAccount,
  clientIp: string
): Promise<void> {
  const updateData = {
    lastLoginAt: new Date(),
    lastLoginIp: clientIp !== "unknown" ? clientIp : null,
    failedLoginAttempts: 0,
    lockedUntil: null,
  };

  if (account.role === "SELLER") {
    await prisma.seller.update({
      where: { id: account.id },
      data: updateData,
    });
  } else if (account.role === "MALL_OWNER") {
    await prisma.mallOwner.update({
      where: { id: account.id },
      data: updateData,
    });
  }
}

// ============================================================================
// LOGGING
// ============================================================================

/**
 * Log login attempt for security monitoring
 */
export function logLoginAttempt(
  email: string,
  ip: string,
  role: AdminPortalRole | null,
  success: boolean,
  errorCode?: LoginErrorCode,
  userId?: string
): void {
  const logData = {
    event: success ? "admin_login_success" : "admin_login_failed",
    email: maskEmail(email),
    userId: userId ?? null,
    role,
    ip,
    errorCode,
    timestamp: new Date().toISOString(),
  };

  if (success) {
    logger.info("Admin login successful", logData);
  } else {
    logger.warn("Admin login failed", logData);
  }
}
