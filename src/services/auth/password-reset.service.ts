// src/lib/services/auth/password-reset.service.ts

import prisma from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { deleteUserSessions } from "@/lib/auth/session";
import { sendNotificationEmail } from "@/lib/email/send";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import { maskEmail } from "@/lib/utils/email";
import { logger } from "@/lib/utils/logger";
import type {
  FoundAccount,
  UserRole,
  PasswordResetErrorCode,
} from "@/types/auth";
import type { AccountType } from "@/types/auth";

const config = AUTH_CONFIG.passwordReset;

// ============================================================================
// PASSWORD UPDATE
// ============================================================================

/**
 * Update password for account
 */
export async function updateAccountPassword(
  account: FoundAccount,
  newPassword: string
): Promise<void> {
  const hashedPassword = await hashPassword(newPassword);

  const updateData = {
    password: hashedPassword,
    passwordChangedAt: new Date(),
    failedLoginAttempts: 0,
    lockedUntil: null,
  };

  switch (account.type) {
    case "USER":
      await prisma.user.update({
        where: { id: account.id },
        data: updateData,
      });
      break;
    case "SELLER":
      await prisma.seller.update({
        where: { id: account.id },
        data: updateData,
      });
      break;
    case "MALL_OWNER":
      await prisma.mallOwner.update({
        where: { id: account.id },
        data: updateData,
      });
      break;
  }
}

// ============================================================================
// SESSION INVALIDATION
// ============================================================================

/**
 * Invalidate all sessions for an account
 */
export async function invalidateAccountSessions(
  accountId: string,
  role: UserRole
): Promise<boolean> {
  if (!config.invalidateAllSessions) {
    return false;
  }

  try {
    await deleteUserSessions(accountId, role);
    return true;
  } catch (error) {
    logger.error("Failed to invalidate sessions", { error });
    return false;
  }
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Send password change notification email (non-blocking)
 */
export async function sendPasswordChangeNotification(
  email: string,
  displayName: string,
  ip: string
): Promise<void> {
  if (!config.sendPasswordChangeNotification) {
    return;
  }

  try {
    await sendNotificationEmail(
      email,
      "Your password was changed",
      `Hi ${displayName},\n\nYour password was successfully changed on ${new Date().toLocaleString()}.\n\nIf you did not make this change, please contact support immediately.\n\nIP Address: ${ip}`,
      {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/password/forgot`,
        text: "Reset Password Again",
      }
    );
  } catch (error) {
    logger.error("Failed to send password change notification", { error });
  }
}

// ============================================================================
// TOKEN ERROR MAPPING
// ============================================================================

/**
 * Map token verification error to API error response
 */
export function mapTokenErrorToResponse(tokenError: string): {
  code: PasswordResetErrorCode;
  message: string;
  status: number;
} {
  const errorMap: Record<
    string,
    { code: PasswordResetErrorCode; message: string; status: number }
  > = {
    EXPIRED: {
      code: "TOKEN_EXPIRED",
      message:
        "This password reset link has expired. Please request a new one.",
      status: 410,
    },
    INVALID_TOKEN: {
      code: "INVALID_TOKEN",
      message: "This password reset link is invalid or has already been used.",
      status: 400,
    },
    ALREADY_USED: {
      code: "INVALID_TOKEN",
      message: "This password reset link has already been used.",
      status: 400,
    },
    WRONG_TYPE: {
      code: "INVALID_TOKEN",
      message: "Invalid reset link.",
      status: 400,
    },
  };

  return (
    errorMap[tokenError] ?? {
      code: "INTERNAL_ERROR",
      message: "Unable to verify reset link. Please try again.",
      status: 500,
    }
  );
}

// ============================================================================
// LOGGING
// ============================================================================

export type PasswordResetEvent = "started" | "completed" | "failed";

/**
 * Log password reset event
 */
export function logPasswordResetEvent(
  event: PasswordResetEvent,
  email: string | null,
  ip: string,
  role: UserRole | null,
  details?: Record<string, unknown>
): void {
  const logData = {
    event: `password_reset_${event}`,
    email: email ? maskEmail(email) : null,
    role,
    ip,
    ...details,
    timestamp: new Date().toISOString(),
  };

  switch (event) {
    case "completed":
      logger.info("Password reset completed", logData);
      break;
    case "failed":
      logger.warn("Password reset failed", logData);
      break;
    default:
      logger.info("Password reset started", logData);
  }
}

// ============================================================================
// ACCOUNT STATUS
// ============================================================================

/**
 * Check if account is active for password reset
 */
export function checkAccountActiveForReset(account: FoundAccount):
  | {
      valid: true;
    }
  | {
      valid: false;
      code: PasswordResetErrorCode;
      message: string;
      status: number;
    } {
  if (!account.isActive) {
    return {
      valid: false,
      code: "ACCOUNT_DISABLED",
      message: "This account has been disabled. Please contact support.",
      status: 403,
    };
  }
  return { valid: true };
}

// ============================================================================
// PASSWORD RESET REQUEST LOGGING
// ============================================================================

export type PasswordResetRequestEvent =
  | "requested"
  | "sent"
  | "failed"
  | "not_found";

/**
 * Log password reset request event
 */
export function logPasswordResetRequestEvent(
  event: PasswordResetRequestEvent,
  email: string,
  ip: string,
  accountType: AccountType | null,
  details?: Record<string, unknown>
): void {
  const logData = {
    event: `password_reset_request_${event}`,
    email: maskEmail(email),
    accountType,
    ip,
    ...details,
    timestamp: new Date().toISOString(),
  };

  switch (event) {
    case "sent":
      logger.info("Password reset email sent", logData);
      break;
    case "failed":
      logger.error("Password reset request failed", logData);
      break;
    case "not_found":
      logger.info("Password reset requested for unknown email", logData);
      break;
    default:
      logger.info("Password reset requested", logData);
  }
}
