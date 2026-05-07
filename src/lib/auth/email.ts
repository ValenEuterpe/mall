// src/lib/auth/email.ts
import prisma from "@/lib/db/prisma";
import { Prisma, TokenType } from "@/prisma/generated/client";
import { env } from "@/env";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import { generateVerificationToken } from "./tokens";
import type {
  SupportedTokenType,
  VerificationLinkType,
  TokenCreationResult,
  TokenVerificationResult,
  TokenStats,
} from "@/types/auth";

const tokenConfig = AUTH_CONFIG.verificationTokens;

// ============================================================================
// INTERNAL UTILITIES
// ============================================================================

/**
 * Calculate expiration date for a given token type
 */
function calculateExpiration(type: SupportedTokenType): Date {
  const expirationMs = tokenConfig.expiration[type];
  return new Date(Date.now() + expirationMs);
}

/**
 * Check if a token request is rate limited
 */
async function checkRateLimit(
  identifier: string,
  type: SupportedTokenType
): Promise<{ limited: boolean; retryAfter?: number }> {
  const rateLimitMs = tokenConfig.rateLimit[type];
  const cutoffTime = new Date(Date.now() - rateLimitMs);

  const recentToken = await prisma.verificationToken.findFirst({
    where: {
      identifier,
      type: type as TokenType,
      createdAt: { gte: cutoffTime },
    },
    orderBy: { createdAt: "desc" },
  });

  if (recentToken) {
    const retryAfter = Math.ceil(
      (recentToken.createdAt.getTime() + rateLimitMs - Date.now()) / 1000
    );
    return { limited: true, retryAfter: Math.max(retryAfter, 1) };
  }

  return { limited: false };
}

/**
 * Revoke all existing tokens of a specific type for an identifier
 */
async function revokeExistingTokens(
  identifier: string,
  type: SupportedTokenType,
  tx?: Prisma.TransactionClient
): Promise<number> {
  const client = tx ?? prisma;
  const { count } = await client.verificationToken.deleteMany({
    where: { identifier, type: type as TokenType },
  });
  return count;
}

// ============================================================================
// GENERIC TOKEN OPERATIONS
// ============================================================================

/**
 * Generic token creation with rate limiting
 */
async function createToken(
  identifier: string,
  type: SupportedTokenType
): Promise<TokenCreationResult> {
  try {
    const rateCheck = await checkRateLimit(identifier, type);
    if (rateCheck.limited) {
      return {
        success: false,
        error: "RATE_LIMITED",
        message: "Please wait before requesting another token",
        retryAfter: rateCheck.retryAfter,
      };
    }

    const token = generateVerificationToken();
    const expiresAt = calculateExpiration(type);

    await prisma.$transaction(async (tx) => {
      await revokeExistingTokens(identifier, type, tx);
      await tx.verificationToken.create({
        data: {
          identifier,
          token,
          type: type as TokenType,
          expires: expiresAt,
        },
      });
    });

    return { success: true, token, expiresAt };
  } catch (error) {
    console.error(`Failed to create ${type} token for ${identifier}:`, error);
    return {
      success: false,
      error: "DATABASE_ERROR",
      message: "Failed to create verification token. Please try again.",
    };
  }
}

/**
 * Generic token verification
 */
async function verifyToken(
  token: string,
  expectedType: TokenType,
  consume: boolean = true
): Promise<TokenVerificationResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const verification = await tx.verificationToken.findUnique({
        where: { token },
      });

      if (!verification) {
        return {
          valid: false as const,
          error: "INVALID_TOKEN" as const,
          message: "Invalid or already used token",
        };
      }

      if (verification.type !== expectedType) {
        return {
          valid: false as const,
          error: "WRONG_TYPE" as const,
          message: "Invalid token type",
        };
      }

      if (verification.expires < new Date()) {
        await tx.verificationToken.delete({ where: { token } });
        return {
          valid: false as const,
          error: "EXPIRED" as const,
          message: "Token has expired. Please request a new one.",
        };
      }

      if (consume) {
        await tx.verificationToken.delete({ where: { token } });
      }

      return {
        valid: true as const,
        email: verification.identifier,
        token: verification.token,
      };
    });

    return result;
  } catch (error) {
    console.error(`Failed to verify ${expectedType} token:`, error);
    return {
      valid: false,
      error: "DATABASE_ERROR",
      message: "Failed to verify token. Please try again.",
    };
  }
}

// ============================================================================
// EMAIL VERIFICATION
// ============================================================================

export async function createEmailVerificationToken(
  email: string
): Promise<TokenCreationResult> {
  return createToken(email.toLowerCase().trim(), "EMAIL_VERIFICATION");
}

export async function verifyEmailToken(
  token: string
): Promise<TokenVerificationResult> {
  return verifyToken(token, TokenType.EMAIL_VERIFICATION, true);
}

// ============================================================================
// PASSWORD RESET
// ============================================================================

export async function createPasswordResetToken(
  email: string
): Promise<TokenCreationResult> {
  return createToken(email.toLowerCase().trim(), "PASSWORD_RESET");
}

export async function verifyPasswordResetToken(
  token: string
): Promise<TokenVerificationResult> {
  return verifyToken(token, TokenType.PASSWORD_RESET, true);
}

export async function validatePasswordResetToken(
  token: string
): Promise<TokenVerificationResult> {
  return verifyToken(token, TokenType.PASSWORD_RESET, false);
}

// ============================================================================
// MAGIC LINK
// ============================================================================

export async function createMagicLinkToken(
  email: string
): Promise<TokenCreationResult> {
  return createToken(email.toLowerCase().trim(), "MAGIC_LINK");
}

export async function verifyMagicLinkToken(
  token: string
): Promise<TokenVerificationResult> {
  return verifyToken(token, TokenType.MAGIC_LINK, false);
}

export async function consumeMagicLinkToken(token: string): Promise<void> {
  try {
    await prisma.verificationToken.delete({ where: { token } });
  } catch {
    // Token may have already been deleted
  }
}

// ============================================================================
// URL GENERATION
// ============================================================================

export function getVerificationUrl(
  token: string,
  type: VerificationLinkType,
  locale?: string
): string {
  const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const path = tokenConfig.paths[type];
  const encodedToken = encodeURIComponent(token);
  const localePrefix = locale ? `/${locale}` : "/en";

  return `${baseUrl}${localePrefix}${path}?token=${encodedToken}`;
}

// ============================================================================
// MAINTENANCE
// ============================================================================

export async function cleanupExpiredTokens(): Promise<number> {
  const { count } = await prisma.verificationToken.deleteMany({
    where: { expires: { lt: new Date() } },
  });

  if (count > 0) {
    console.log(`🧹 Cleaned up ${count} expired verification tokens`);
  }

  return count;
}

export async function revokeTokensForIdentifier(
  identifier: string,
  type?: TokenType
): Promise<number> {
  const { count } = await prisma.verificationToken.deleteMany({
    where: {
      identifier: identifier.toLowerCase().trim(),
      ...(type && { type }),
    },
  });

  return count;
}

export async function getTokenStats(): Promise<TokenStats> {
  const now = new Date();

  const [byTypeResults, expiredCount, totalCount] = await Promise.all([
    prisma.verificationToken.groupBy({
      by: ["type"],
      _count: true,
    }),
    prisma.verificationToken.count({
      where: { expires: { lt: now } },
    }),
    prisma.verificationToken.count(),
  ]);

  const byType = Object.values(TokenType).reduce(
    (acc, type) => {
      const found = byTypeResults.find((r) => r.type === type);
      acc[type] = found?._count ?? 0;
      return acc;
    },
    {} as Record<string, number>
  );

  return { byType, expired: expiredCount, total: totalCount };
}
