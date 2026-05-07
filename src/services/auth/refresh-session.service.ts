// src/services/auth/refresh-session.service.ts
// Reusable refresh session logic for both middleware and API routes

import prisma from "@/lib/db/prisma";
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  generateTokenFamily,
} from "@/lib/auth/tokens";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import { logger } from "@/lib/utils/logger";
import type { UserRole, RefreshErrorCode } from "@/types/auth";

const config = AUTH_CONFIG.tokenRefresh;
const cookieConfig = AUTH_CONFIG.cookies;

// ============================================================================
// TYPES
// ============================================================================

export interface RefreshResult {
  success: true;
  accessToken: string;
  refreshToken?: string; // Only present if token rotation is enabled
  user: {
    userId: string;
    email: string;
    role: UserRole;
    sessionId: string;
  };
  expiresAt: Date;
}

export interface RefreshError {
  success: false;
  code: RefreshErrorCode;
  message: string;
  requiresLogin: boolean;
}

export type RefreshOutcome = RefreshResult | RefreshError;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Session with relations - extended to include tokenFamily and isRevoked
 */
interface SessionWithRelationsExtended {
  id: string;
  sessionToken: string;
  expires: Date;
  tokenFamily: string | null;
  isRevoked: boolean;
  updatedAt: Date;
  user: {
    id: string;
    email: string;
    isActive: boolean;
    firstName: string;
    lastName: string;
  } | null;
  seller: {
    id: string;
    email: string;
    isActive: boolean;
    businessName: string | null;
  } | null;
  mallOwner: {
    id: string;
    email: string;
    name: string;
  } | null;
}

/**
 * Find session with all related account types
 */
async function findSessionWithRelations(
  sessionId: string
): Promise<SessionWithRelationsExtended | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      sessionToken: true,
      expires: true,
      tokenFamily: true,
      isRevoked: true,
      updatedAt: true,
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

  return session;
}

/**
 * Extract user info from session relations
 */
function extractUserFromSession(
  session: SessionWithRelationsExtended
): { userId: string; email: string; role: UserRole; isActive: boolean } | null {
  if (session.user) {
    return {
      userId: session.user.id,
      email: session.user.email,
      role: "USER",
      isActive: session.user.isActive,
    };
  }

  if (session.seller) {
    return {
      userId: session.seller.id,
      email: session.seller.email,
      role: "SELLER",
      isActive: session.seller.isActive,
    };
  }

  if (session.mallOwner) {
    return {
      userId: session.mallOwner.id,
      email: session.mallOwner.email,
      role: "MALL_OWNER",
      isActive: true, // Mall owners don't have isActive field in our select
    };
  }

  return null;
}

/**
 * Handle token reuse attack - invalidate all sessions for the user
 */
async function handleTokenReuseAttack(
  userId: string,
  role: UserRole
): Promise<void> {
  logger.error("Token reuse detected, invalidating all sessions", { role, userId });

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
}

/**
 * Update session activity and optionally extend expiry
 */
async function updateSessionActivity(
  sessionId: string,
  extend: boolean = false
): Promise<void> {
  const data: { expires?: Date; updatedAt?: Date } = {};

  if (extend) {
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + config.sessionExtensionDays);
    data.expires = newExpiry;
  }

  // Always update the updatedAt timestamp
  data.updatedAt = new Date();

  await prisma.session.update({
    where: { id: sessionId },
    data,
  });
}

// ============================================================================
// MAIN REFRESH FUNCTION
// ============================================================================

/**
 * Attempt to refresh the session using a refresh token.
 * This function can be called from both middleware and API routes.
 *
 * @param refreshToken - The refresh token from cookies
 * @returns RefreshOutcome - Either success with new tokens or error with details
 */
export async function refreshSession(
  refreshToken: string
): Promise<RefreshOutcome> {
  try {
    // 1. Verify the refresh token
    const payload = verifyRefreshToken(refreshToken);

    if (!payload) {
      return {
        success: false,
        code: "INVALID_TOKEN",
        message: "Invalid refresh token",
        requiresLogin: true,
      };
    }

    // 2. Find the session
    const session = await findSessionWithRelations(payload.sessionId);

    if (!session) {
      return {
        success: false,
        code: "SESSION_NOT_FOUND",
        message: "Session not found",
        requiresLogin: true,
      };
    }

    // 3. Check if session is expired
    if (session.expires < new Date()) {
      // Clean up expired session
      await prisma.session
        .delete({ where: { id: session.id } })
        .catch(() => {});

      return {
        success: false,
        code: "SESSION_EXPIRED",
        message: "Session has expired",
        requiresLogin: true,
      };
    }

    // 4. Check if session is revoked
    if (session.isRevoked) {
      return {
        success: false,
        code: "SESSION_REVOKED" as RefreshErrorCode,
        message: "Session has been revoked",
        requiresLogin: true,
      };
    }

    // 5. Check for token reuse attack (token family mismatch)
    // If the refresh token's family doesn't match the session's family,
    // it means an old token is being reused - potential attack!
    if (
      config.invalidateOnTokenReuse &&
      payload.tokenFamily &&
      session.tokenFamily &&
      payload.tokenFamily !== session.tokenFamily
    ) {
      // Token reuse detected - this could be an attack
      // Invalidate all sessions for this user as a security measure
      const userInfo = extractUserFromSession(session);
      if (userInfo) {
        await handleTokenReuseAttack(userInfo.userId, userInfo.role);
      }

      return {
        success: false,
        code: "TOKEN_REUSE_DETECTED",
        message: "Security violation detected. Please log in again.",
        requiresLogin: true,
      };
    }

    // 5. Extract user info from session
    const userInfo = extractUserFromSession(session);

    if (!userInfo) {
      return {
        success: false,
        code: "INVALID_SESSION",
        message: "Invalid session state",
        requiresLogin: true,
      };
    }

    // 6. Check if account is active
    if (!userInfo.isActive) {
      // Delete session for disabled account
      await prisma.session
        .delete({ where: { id: session.id } })
        .catch(() => {});

      return {
        success: false,
        code: "ACCOUNT_DISABLED",
        message: "Account has been disabled",
        requiresLogin: true,
      };
    }

    // 7. Generate new access token
    const newAccessToken = generateAccessToken({
      userId: userInfo.userId,
      email: userInfo.email,
      role: userInfo.role,
      sessionId: session.id,
    });

    // 8. Calculate expiry (15 minutes from now for access token)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // 9. Optionally rotate refresh token and extend session
    let newRefreshToken: string | undefined;

    if (config.rotateRefreshToken) {
      // Generate new token family for rotation
      const newTokenFamily = generateTokenFamily();

      // Generate new refresh token with new family
      newRefreshToken = generateRefreshToken({
        userId: userInfo.userId,
        sessionId: session.id,
        tokenFamily: newTokenFamily,
      });

      // Update session with new token family and optionally extend expiry
      await prisma.session.update({
        where: { id: session.id },
        data: {
          tokenFamily: newTokenFamily,
          updatedAt: new Date(),
          ...(config.extendSessionOnRefresh && {
            expires: (() => {
              const newExpiry = new Date();
              newExpiry.setDate(
                newExpiry.getDate() + config.sessionExtensionDays
              );
              return newExpiry;
            })(),
          }),
        },
      });
    } else {
      // Just update activity
      await updateSessionActivity(session.id, config.extendSessionOnRefresh);
    }

    // 10. Return success with new tokens
    return {
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        userId: userInfo.userId,
        email: userInfo.email,
        role: userInfo.role,
        sessionId: session.id,
      },
      expiresAt,
    };
  } catch (error) {
    logger.error("Refresh session error", { error });

    return {
      success: false,
      code: "INTERNAL_ERROR",
      message: "Failed to refresh session",
      requiresLogin: true,
    };
  }
}

// ============================================================================
// COOKIE HELPERS
// ============================================================================

/**
 * Get cookie options for access token
 */
export function getAccessTokenCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge: number;
} {
  return {
    ...cookieConfig.base,
    maxAge: 15 * 60, // 15 minutes
  };
}

/**
 * Get cookie options for refresh token
 */
export function getRefreshTokenCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge: number;
} {
  return {
    ...cookieConfig.base,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  };
}

/**
 * Get cookie options for clearing tokens
 */
export function getClearCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge: number;
} {
  return cookieConfig.clear;
}
