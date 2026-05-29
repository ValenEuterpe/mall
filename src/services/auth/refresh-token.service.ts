// src/lib/services/auth/refresh-token.service.ts

import prisma from "@/lib/db/prisma";
import { Prisma } from "@/prisma/generated/client";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import { logger } from "@/lib/utils/logger";
import type {
  UserRole,
  SessionOwner,
  SessionWithRelations,
} from "@/types/auth";

const config = AUTH_CONFIG.tokenRefresh;

// ============================================================================
// SESSION LOOKUP
// ============================================================================

/**
 * Find session with all related account types
 */
export async function findSessionWithRelations(
  sessionId: string
): Promise<SessionWithRelations | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          isActive: true,
          firstName: true,
          lastName: true,
        },
      },
      seller: {
        select: {
          id: true,
          email: true,
          isActive: true,
          businessName: true,
        },
      },
      mallOwner: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  return session as SessionWithRelations | null;
}

/**
 * Extract session owner from session relations
 */
export function getSessionOwner(
  session: SessionWithRelations
): SessionOwner | null {
  if (session.user) {
    return {
      type: "USER",
      data: {
        id: session.user.id,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        isActive: session.user.isActive,
      },
    };
  }

  if (session.seller) {
    return {
      type: "SELLER",
      data: {
        id: session.seller.id,
        email: session.seller.email,
        businessName: session.seller.businessName,
        isActive: session.seller.isActive,
      },
    };
  }

  if (session.mallOwner) {
    return {
      type: "MALL_OWNER",
      data: {
        id: session.mallOwner.id,
        email: session.mallOwner.email,
        name: session.mallOwner.name,
      },
    };
  }

  return null;
}

// ============================================================================
// SESSION VALIDATION
// ============================================================================

/**
 * Check if session is expired
 */
export function isSessionExpired(session: SessionWithRelations): boolean {
  return session.expires < new Date();
}

/**
 * Delete expired session
 */
export async function deleteExpiredSession(sessionId: string): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
}

/**
 * Delete session for disabled account
 */
export async function deleteSessionForDisabledAccount(
  sessionId: string
): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
}

// ============================================================================
// TOKEN REUSE DETECTION
// ============================================================================

/**
 * Handle token reuse attack detection
 * Invalidates all sessions for the user if token reuse is detected
 */
export async function handleTokenReuseDetection(
  userId: string,
  role: UserRole,
  sessionId: string
): Promise<void> {
  logger.error("Token reuse detected, invalidating all sessions", { userId, role, sessionId });

  const roleFieldMap: Record<UserRole, string> = {
    USER: "userId",
    SELLER: "sellerId",
    MALL_OWNER: "mallOwnerId",
  };

  const whereField = roleFieldMap[role];

  await prisma.session.deleteMany({
    where: {
      [whereField]: userId,
    },
  });

  // Additional security measures could be added here:
  // 1. Send a security alert email to the user
  // 2. Log this to a security audit table
  // 3. Trigger additional security measures
}

/**
 * Check for token family mismatch (token reuse)
 */
export function isTokenFamilyMismatch(
  payloadFamily: string | undefined,
  sessionFamily: string | undefined
): boolean {
  if (payloadFamily && sessionFamily) {
    return payloadFamily !== sessionFamily;
  }
  return false;
}

// ============================================================================
// SESSION ACTIVITY
// ============================================================================

/**
 * Update session activity and optionally extend expiry
 */
export async function updateSessionActivity(
  sessionId: string,
  extend: boolean = false
): Promise<void> {
  const data: Prisma.SessionUpdateArgs["data"] = {};
  if (extend) {
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + config.sessionExtensionDays);
    data.expires = newExpiry;
  } else {
    data.updatedAt = new Date();
  }

  await prisma.session.update({
    where: { id: sessionId },
    data,
  });
}

// ============================================================================
// LOGGING
// ============================================================================

export type RefreshEvent = "success" | "failed" | "token_reuse";

/**
 * Log token refresh event
 */
export function logRefreshEvent(
  event: RefreshEvent,
  ip: string,
  sessionId: string | null,
  userId: string | null,
  role: UserRole | null,
  details?: Record<string, unknown>
): void {
  const logData = {
    event: `token_refresh_${event}`,
    sessionId,
    userId,
    role,
    ip,
    ...details,
    timestamp: new Date().toISOString(),
  };

  switch (event) {
    case "success":
      logger.info("Token refresh successful", logData);
      break;
    case "token_reuse":
      logger.error("TOKEN REUSE DETECTED", logData);
      break;
    case "failed":
      logger.warn("Token refresh failed", logData);
      break;
  }
}
