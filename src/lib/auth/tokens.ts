// src/lib/auth/tokens.ts

import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { env } from "@/env";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import type { AccessTokenPayload, RefreshTokenPayload, UserRole } from "@/types/auth";

const jwtConfig = AUTH_CONFIG.jwt;

// ============================================================================
// ACCESS TOKEN
// ============================================================================

/**
 * Generate access token (short-lived)
 */
export function generateAccessToken(payload: Omit<AccessTokenPayload, "iat" | "exp">): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
        expiresIn: env.JWT_ACCESS_EXPIRY as jwt.SignOptions["expiresIn"],
        issuer: jwtConfig.issuer,
        audience: jwtConfig.accessAudience,
    });
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
            issuer: jwtConfig.issuer,
            audience: jwtConfig.accessAudience,
        }) as AccessTokenPayload;
        return decoded;
    } catch {
        return null;
    }
}

// ============================================================================
// REFRESH TOKEN
// ============================================================================

/**
 * Generate refresh token (long-lived)
 */
export function generateRefreshToken(
    payload: Omit<RefreshTokenPayload, "iat" | "exp">
): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
        expiresIn: env.JWT_REFRESH_EXPIRY as jwt.SignOptions["expiresIn"],
        issuer: jwtConfig.issuer,
        audience: jwtConfig.refreshAudience,
    });
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
        const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
            issuer: jwtConfig.issuer,
            audience: jwtConfig.refreshAudience,
        }) as RefreshTokenPayload;
        return decoded;
    } catch {
        return null;
    }
}

// ============================================================================
// UTILITY TOKENS
// ============================================================================

/**
 * Generate verification token (email, password reset, magic link)
 */
export function generateVerificationToken(): string {
    return nanoid(64);
}

/**
 * Generate token family ID for refresh token rotation
 */
export function generateTokenFamily(): string {
    return nanoid(32);
}

/**
 * Generate session token
 */
export function generateSessionToken(): string {
    return nanoid(64);
}