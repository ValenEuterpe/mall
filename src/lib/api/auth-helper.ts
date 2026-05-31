//src\lib\api\auth-helper.ts

import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth/tokens";
import type {
  UserRole,
  AuthenticatedUser,
  AuthErrorCode,
  RequestContext,
} from "@/types/auth";
import { getClientIp, getUserAgent } from "@/lib/http/request";
import { AUTH_CONFIG } from "@/lib/config/auth.config";

const cookieConfig = AUTH_CONFIG.cookies;

// ============================================================================
// AUTH ERROR CLASS
// ============================================================================

/**
 * Authentication error with status code
 */
export class AuthError extends Error {
  public readonly statusCode: number;
  public readonly code: AuthErrorCode;

  constructor(
    message: string,
    code: AuthErrorCode = "UNAUTHORIZED",
    statusCode: number = 401
  ) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.statusCode = statusCode;
  }

  /**
   * Convert to API response
   */
  toResponse(): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: this.code,
          message: this.message,
        },
      },
      { status: this.statusCode }
    );
  }
}

// ============================================================================
// TOKEN EXTRACTION
// ============================================================================

/**
 * Extract access token from request
 * Checks cookies first, then Authorization header
 */
export function extractAccessToken(request: NextRequest): string | null {
  // 1. Check cookies (primary method for web clients)
  const cookieToken = request.cookies.get(
    cookieConfig.names.accessToken
  )?.value;
  if (cookieToken) {
    return cookieToken;
  }

  // 2. Check Authorization header (for API clients)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
}

/**
 * Extract refresh token from request
 */
export function extractRefreshToken(request: NextRequest): string | null {
  return request.cookies.get(cookieConfig.names.refreshToken)?.value ?? null;
}

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

/**
 * Require authentication - throws if not authenticated
 * Use in API routes that require authentication
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   try {
 *     const user = requireAuth(request);
 *     // User is authenticated
 *   } catch (error) {
 *     if (error instanceof AuthError) {
 *       return error.toResponse();
 *     }
 *     throw error;
 *   }
 * }
 * ```
 */
export function requireAuth(
  request: NextRequest,
  allowedRoles?: UserRole[]
): AuthenticatedUser {
  const token = extractAccessToken(request);

  if (!token) {
    throw new AuthError(
      "Authentication required. Please log in.",
      "NO_TOKEN",
      401
    );
  }

  const user = verifyAccessToken(token);

  if (!user) {
    throw new AuthError(
      "Invalid or expired authentication token. Please log in again.",
      "INVALID_TOKEN",
      401
    );
  }

  // Check role-based access
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      throw new AuthError(
        "You do not have permission to access this resource.",
        "INSUFFICIENT_PERMISSIONS",
        403
      );
    }
  }

  return user;
}

/**
 * Require specific role(s) - convenience wrapper
 */
export function requireRole(
  request: NextRequest,
  ...roles: UserRole[]
): AuthenticatedUser {
  return requireAuth(request, roles);
}

/**
 * Optional authentication - returns null if not authenticated
 */
export function optionalAuth(request: NextRequest): AuthenticatedUser | null {
  const token = extractAccessToken(request);

  if (!token) {
    return null;
  }

  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

/**
 * Check if request is authenticated (boolean check)
 */
export function isAuthenticated(request: NextRequest): boolean {
  return optionalAuth(request) !== null;
}

/**
 * Check if user has specific role
 */
export function hasRole(request: NextRequest, ...roles: UserRole[]): boolean {
  const user = optionalAuth(request);
  if (!user) return false;
  return roles.includes(user.role);
}

// ============================================================================
// REQUEST CONTEXT
// ============================================================================

/**
 * Get request context for logging
 */
export function getRequestContext(request: NextRequest): RequestContext {
  return {
    ip: getClientIp(request),
    userAgent: getUserAgent(request) ?? "unknown",
    method: request.method,
    path: request.nextUrl.pathname,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(
  message: string = "Authentication required"
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message,
      },
    },
    { status: 401 }
  );
}

/**
 * Create forbidden response
 */
export function forbiddenResponse(
  message: string = "Insufficient permissions"
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "FORBIDDEN",
        message,
      },
    },
    { status: 403 }
  );
}
