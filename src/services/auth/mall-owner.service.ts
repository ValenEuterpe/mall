// src/lib/services/auth/mall-owner.service.ts

import prisma from "@/lib/db/prisma";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import { maskEmail } from "@/lib/utils/email";
import { logger } from "@/lib/utils/logger";
import type { MallOwnerInfo } from "@/types/auth";
import { verifyMagicLinkToken, consumeMagicLinkToken } from "@/lib/auth/email";
import { VerifyLoginErrorCode, MallOwnerRecord } from "@/types/auth";

const config = AUTH_CONFIG.mallOwner;

// ============================================================================
// ACCOUNT LOOKUP
// ============================================================================

/**
 * Find mall owner by email
 */
export async function findMallOwnerByEmail(
  email: string
): Promise<MallOwnerInfo | null> {
  const mallOwner = await prisma.mallOwner.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      lastLoginAt: true,
    },
  });

  return mallOwner;
}

/**
 * Update mall owner's magic link request metadata
 */
export async function updateMagicLinkRequestMetadata(
  mallOwnerId: string,
  clientIp: string
): Promise<void> {
  try {
    await prisma.mallOwner.update({
      where: { id: mallOwnerId },
      data: {
        lastMagicLinkRequestedAt: new Date(),
        lastMagicLinkRequestIp: clientIp !== "unknown" ? clientIp : null,
      },
    });
  } catch (error) {
    logger.error("Failed to update mall owner login attempt", { error });
  }
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export type MagicLinkEvent =
  | "magic_link_requested"
  | "magic_link_sent"
  | "magic_link_blocked"
  | "magic_link_failed";

/**
 * Log security event for mall owner magic link
 */
export function logMagicLinkEvent(
  event: MagicLinkEvent,
  email: string | null,
  ip: string,
  userAgent: string,
  details?: Record<string, unknown>
): void {
  const logData = {
    event,
    email: email ? maskEmail(email) : null,
    ip,
    userAgent: userAgent.substring(0, 100),
    ...details,
    timestamp: new Date().toISOString(),
  };

  switch (event) {
    case "magic_link_sent":
      logger.info("Mall Owner magic link sent", logData);
      break;
    case "magic_link_blocked":
      logger.warn("Mall Owner magic link blocked", logData);
      break;
    case "magic_link_failed":
      logger.error("Mall Owner magic link failed", logData);
      break;
    default:
      logger.info("Mall Owner magic link requested", logData);
  }
}

/**
 * Record login attempt for audit trail
 */
export async function recordMallOwnerLoginAttempt(
  mallOwnerId: string | null,
  email: string,
  ip: string,
  userAgent: string,
  success: boolean,
  failureReason?: string
): Promise<void> {
  try {
    if (!success && config.logFailedAttempts) {
      logger.warn("Mall Owner login attempt", {
        mallOwnerId,
        email: maskEmail(email),
        ip,
        success,
        failureReason,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error("Failed to record login attempt", { error });
  }
}

/**
 * Find mall owner by email with password for verification
 */
export async function findMallOwnerForVerification(
  email: string
): Promise<MallOwnerRecord | null> {
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

  return mallOwner;
}

/**
 * Update mall owner login metadata after successful verification.
 * Also clears any active lockout state.
 */
export async function updateMallOwnerLoginMetadata(
  mallOwnerId: string,
  clientIp: string
): Promise<void> {
  await prisma.mallOwner.update({
    where: { id: mallOwnerId },
    data: {
      lastLoginAt: new Date(),
      lastLoginIp: clientIp !== "unknown" ? clientIp : null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });
}

/**
 * Check whether a mall owner is currently locked out.
 * Returns null if not locked, or { retryAfterSeconds } if locked.
 */
export function checkMallOwnerLockStatus(
  mallOwner: Pick<MallOwnerRecord, "lockedUntil">
): { retryAfterSeconds: number } | null {
  if (mallOwner.lockedUntil && mallOwner.lockedUntil > new Date()) {
    return {
      retryAfterSeconds: Math.ceil(
        (mallOwner.lockedUntil.getTime() - Date.now()) / 1000
      ),
    };
  }
  return null;
}

/**
 * Increment failedLoginAttempts; lock the account if the threshold is hit.
 * Returns the new attempt count and whether a lock was applied.
 */
export async function handleMallOwnerFailedAttempt(
  mallOwner: Pick<MallOwnerRecord, "id" | "failedLoginAttempts">
): Promise<{ shouldLock: boolean; newAttempts: number }> {
  if (!AUTH_CONFIG.login.trackFailedAttempts) {
    return { shouldLock: false, newAttempts: 0 };
  }

  const newAttempts = (mallOwner.failedLoginAttempts ?? 0) + 1;
  const shouldLock = newAttempts >= AUTH_CONFIG.login.maxFailedAttempts;

  await prisma.mallOwner.update({
    where: { id: mallOwner.id },
    data: {
      failedLoginAttempts: newAttempts,
      ...(shouldLock && {
        lockedUntil: new Date(
          Date.now() + AUTH_CONFIG.login.lockoutDurationMinutes * 60 * 1000
        ),
      }),
    },
  });

  return { shouldLock, newAttempts };
}

// ============================================================================
// TOKEN VERIFICATION
// ============================================================================

export interface TokenVerificationSuccess {
  valid: true;
  email: string;
}

export interface TokenVerificationError {
  valid: false;
  error: string;
  code: VerifyLoginErrorCode;
  message: string;
  status: number;
}

export type TokenVerificationResult =
  | TokenVerificationSuccess
  | TokenVerificationError;

/**
 * Token error mapping
 */
const TOKEN_ERROR_MAP: Record<
  string,
  {
    code: VerifyLoginErrorCode;
    message: string;
    status: number;
  }
> = {
  EXPIRED: {
    code: "TOKEN_EXPIRED",
    message: "This login link has expired. Please request a new one.",
    status: 410,
  },
  INVALID_TOKEN: {
    code: "INVALID_TOKEN",
    message: "This login link is invalid or has already been used.",
    status: 400,
  },
  ALREADY_USED: {
    code: "INVALID_TOKEN",
    message: "This login link has already been used. Please request a new one.",
    status: 400,
  },
};

/**
 * Verify magic link token and map errors
 */
export async function verifyMallOwnerToken(
  token: string
): Promise<TokenVerificationResult> {
  const result = await verifyMagicLinkToken(token);

  if (!result.valid) {
    const errorInfo = TOKEN_ERROR_MAP[result.error] ?? {
      code: "INTERNAL_ERROR" as VerifyLoginErrorCode,
      message: "Unable to verify login link. Please try again.",
      status: 500,
    };

    return {
      valid: false,
      error: result.error,
      ...errorInfo,
    };
  }

  return {
    valid: true,
    email: result.email,
  };
}

/**
 * Consume magic link token (mark as used)
 */
export async function consumeMallOwnerToken(token: string): Promise<void> {
  await consumeMagicLinkToken(token);
}

// ============================================================================
// VERIFY LOGIN LOGGING
// ============================================================================

export type VerifyLoginEvent =
  | "verify_started"
  | "verify_success"
  | "verify_failed"
  | "verify_blocked";

/**
 * Log verify login security event
 */
export function logVerifyLoginEvent(
  event: VerifyLoginEvent,
  email: string | null,
  ip: string,
  userAgent: string,
  details?: Record<string, unknown>
): void {
  const logData = {
    event: `mall_owner_${event}`,
    email: email ? maskEmail(email) : null,
    ip,
    userAgent: userAgent.substring(0, 100),
    ...details,
    timestamp: new Date().toISOString(),
  };

  switch (event) {
    case "verify_success":
      logger.info("Mall Owner login verified", logData);
      break;
    case "verify_blocked":
      logger.warn("Mall Owner login blocked", logData);
      break;
    case "verify_failed":
      logger.warn("Mall Owner login verification failed", logData);
      break;
    default:
      logger.info("Mall Owner login verification started", logData);
  }
}
