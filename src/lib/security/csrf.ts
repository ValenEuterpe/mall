// src/lib/security/csrf.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { logger } from "@/lib/utils/logger";

// ============================================================================
// CONFIGURATION
// ============================================================================

const CSRF_CONFIG = {
  /** Cookie name for CSRF token */
  cookieName: "csrf_token",
  /** Header name for CSRF token */
  headerName: "x-csrf-token",
  /** Token length */
  tokenLength: 32,
  /** Token expiry in seconds */
  maxAge: 60 * 60 * 24, // 24 hours
  /** HTTP methods that don't require CSRF protection */
  safeMethods: ["GET", "HEAD", "OPTIONS"] as const,
} as const;

// ============================================================================
// TOKEN GENERATION & MANAGEMENT
// ============================================================================

/**
 * Generate a new CSRF token
 */
export function generateCsrfToken(): string {
  return nanoid(CSRF_CONFIG.tokenLength);
}

/**
 * Set CSRF token in cookie and return it
 */
export async function setCsrfToken(): Promise<string> {
  const token = generateCsrfToken();
  const cookieStore = await cookies();

  cookieStore.set(CSRF_CONFIG.cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: CSRF_CONFIG.maxAge,
    path: "/",
  });

  return token;
}

/**
 * Get CSRF token from cookie
 */
export async function getCsrfToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_CONFIG.cookieName)?.value;
}

/**
 * Clear CSRF token
 */
export async function clearCsrfToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CSRF_CONFIG.cookieName);
}

// ============================================================================
// VERIFICATION
// ============================================================================

/**
 * Verify CSRF token from request
 * Compares cookie token with header token
 */
export async function verifyCsrfToken(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const tokenFromCookie = cookieStore.get(CSRF_CONFIG.cookieName)?.value;
  const tokenFromHeader = request.headers.get(CSRF_CONFIG.headerName);

  if (!tokenFromCookie || !tokenFromHeader) {
    return false;
  }

  // Use timing-safe comparison
  return timingSafeEqual(tokenFromCookie, tokenFromHeader);
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * CSRF protection middleware
 * Returns null to continue, or NextResponse to block
 *
 * @example
 * ```ts
 * // In API route
 * const csrfError = await withCsrfProtection(request);
 * if (csrfError) return csrfError;
 * ```
 */
export async function withCsrfProtection(
  request: NextRequest
): Promise<NextResponse | null> {
  // Skip CSRF check for safe methods
  if (
    CSRF_CONFIG.safeMethods.includes(
      request.method as (typeof CSRF_CONFIG.safeMethods)[number]
    )
  ) {
    return null;
  }

  // Verify CSRF token
  const isValid = await verifyCsrfToken(request);

  if (!isValid) {
    logger.warn("CSRF token validation failed", {
      method: request.method,
      path: request.nextUrl.pathname,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CSRF_ERROR",
          message: "Invalid or missing CSRF token",
        },
      },
      { status: 403 }
    );
  }

  return null; // Continue
}

/**
 * Check if request method requires CSRF protection
 */
export function requiresCsrfProtection(method: string): boolean {
  return !CSRF_CONFIG.safeMethods.includes(
    method as (typeof CSRF_CONFIG.safeMethods)[number]
  );
}

// ============================================================================
// API ROUTE HELPERS
// ============================================================================

/**
 * Get CSRF token for client
 * Use this in an API route to provide token to frontend
 */
export async function handleGetCsrfToken(): Promise<NextResponse> {
  const existingToken = await getCsrfToken();
  const token = existingToken || (await setCsrfToken());

  return NextResponse.json({
    success: true,
    data: { csrfToken: token },
  });
}
