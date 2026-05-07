// src/lib/auth/session.ts

import prisma from "@/lib/db/prisma";
import { Prisma } from "@/prisma/generated/client";
import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenFamily,
  generateSessionToken,
} from "./tokens";
import type {
  UserRole,
  CreateSessionInput,
  SessionOwnerField,
  SessionWithOwner,
  SessionOwner,
} from "@/types/auth";

// ============================================================================
// CONSTANTS
// ============================================================================

const ROLE_TO_FIELD_MAP: Record<UserRole, SessionOwnerField> = {
  USER: "userId",
  SELLER: "sellerId",
  MALL_OWNER: "mallOwnerId",
};

const SESSION_EXPIRY_DAYS = 7;

// ============================================================================
// SESSION CREATION
// ============================================================================

/**
 * Create new session with tokens
 */
export async function createSession(input: CreateSessionInput): Promise<{
  session: {
    id: string;
    sessionToken: string;
    expires: Date;
  };
  accessToken: string;
  refreshToken: string;
}> {
  const sessionToken = generateSessionToken();
  const tokenFamily = generateTokenFamily();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  const ownerField = ROLE_TO_FIELD_MAP[input.role];

  const session = await prisma.$transaction(async (tx) => {
    return tx.session.create({
      data: {
        sessionToken,
        [ownerField]: input.userId,
        expires: expiresAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        tokenFamily, // Store token family for rotation security
      },
      select: {
        id: true,
        sessionToken: true,
        expires: true,
      },
    });
  });

  const accessToken = generateAccessToken({
    userId: input.userId,
    email: input.email,
    role: input.role,
    sessionId: session.id,
  });

  const refreshToken = generateRefreshToken({
    userId: input.userId,
    sessionId: session.id,
    tokenFamily, // Include token family in refresh token
  });

  return {
    session,
    accessToken,
    refreshToken,
  };
}

// ============================================================================
// SESSION RETRIEVAL
// ============================================================================

/**
 * Get session with owner information
 */
export async function getSession(
  sessionToken: string
): Promise<SessionWithOwner | null> {
  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
        },
      },
      seller: {
        select: {
          id: true,
          email: true,
          businessName: true,
          isActive: true,
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

  if (!session) return null;

  const owner = extractSessionOwner({
    user: session.user,
    seller: session.seller,
    mallOwner: session.mallOwner,
  });

  return {
    session: {
      id: session.id,
      sessionToken: session.sessionToken,
      expires: session.expires,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
    },
    owner,
  };
}

/**
 * Extract owner from session with relations
 */
function extractSessionOwner(relations: {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  } | null;
  seller: {
    id: string;
    email: string;
    businessName: string | null;
    isActive: boolean;
  } | null;
  mallOwner: { id: string; email: string; name: string } | null;
}): SessionOwner {
  if (relations.user) {
    return { type: "USER", data: relations.user };
  }
  if (relations.seller) {
    return { type: "SELLER", data: relations.seller };
  }
  if (relations.mallOwner) {
    return { type: "MALL_OWNER", data: relations.mallOwner };
  }
  return null;
}

// ============================================================================
// SESSION DELETION
// ============================================================================

/**
 * Delete single session by token
 */
export async function deleteSession(sessionToken: string): Promise<void> {
  try {
    await prisma.session.delete({
      where: { sessionToken },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      // Session already deleted - ignore
      return;
    }
    throw error;
  }
}

/**
 * Delete all sessions for a user by role
 */
export async function deleteUserSessions(
  userId: string,
  role: UserRole
): Promise<number> {
  const whereClause: Record<UserRole, Prisma.SessionWhereInput> = {
    USER: { userId },
    SELLER: { sellerId: userId },
    MALL_OWNER: { mallOwnerId: userId },
  };

  const { count } = await prisma.session.deleteMany({
    where: whereClause[role],
  });

  return count;
}

// ============================================================================
// SESSION MAINTENANCE
// ============================================================================

/**
 * Cleanup expired sessions
 * Should be called by a scheduled job
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const { count } = await prisma.session.deleteMany({
    where: {
      expires: { lt: new Date() },
    },
  });

  if (count > 0) {
    console.log(`🧹 Cleaned up ${count} expired sessions`);
  }

  return count;
}

/**
 * Extend session expiry
 */
export async function extendSession(
  sessionId: string,
  days: number = SESSION_EXPIRY_DAYS
): Promise<void> {
  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + days);

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      expires: newExpiry,
    },
  });
}

/**
 * Update session activity timestamp
 */
export async function updateSessionActivity(sessionId: string): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: {},
  });
}
