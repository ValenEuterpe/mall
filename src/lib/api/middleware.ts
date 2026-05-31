// src/lib/api/middleware.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, optionalAuth, AuthError } from "@/lib/api/auth-helper";
import {
  apiRateLimiter,
  getRateLimitIdentifier,
  createRateLimitHeaders,
} from "../utils/rate-limit";
import { handleError } from "@/lib/errors/error-handler";
import { addSecurityHeaders } from "@/lib/security/headers";
import { withCsrfProtection } from "@/lib/security/csrf";
import {
  createAuditLog,
  getAuditInfo,
  type AuditAction,
} from "@/lib/audit/logger";
import type { UserRole, AuthenticatedUser } from "@/types/auth";

// ============================================================================
// TYPES
// ============================================================================

interface MiddlewareOptions {
  /** Require authentication */
  requireAuth?: boolean;
  /** Allowed roles (if requireAuth is true) */
  allowedRoles?: UserRole[];
  /** Enable rate limiting */
  rateLimit?: boolean;
  /** Custom rate limit max requests */
  rateLimitMax?: number;
  /** Roles that bypass rate limiting (e.g., MALL_OWNER for admin operations) */
  skipRateLimitForRoles?: UserRole[];
  /** Audit action to log */
  auditAction?: AuditAction;
  /** Add security headers */
  securityHeaders?: boolean;
  /**
   * Enforce CSRF token verification for unsafe methods (POST/PUT/PATCH/DELETE).
   * Default: true. Disable only for token-bootstrap endpoints (login, signup,
   * password reset confirm, magic-link verify) where the user has no session yet.
   */
  csrf?: boolean;
}

type RouteHandler<T = unknown> = (
  request: NextRequest,
  context?: { params: Promise<T> }
) => Promise<NextResponse>;

type AuthenticatedRouteHandler<T = unknown> = (
  request: NextRequest,
  context: { params: Promise<T>; user: AuthenticatedUser }
) => Promise<NextResponse>;

// ============================================================================
// COMPOSITE MIDDLEWARE
// ============================================================================

/**
 * Composite middleware for API routes
 * Combines authentication, rate limiting, security headers, and audit logging
 *
 * @example
 * ```ts
 * export const POST = withMiddleware(
 *   async (request, { user }) => {
 *     return NextResponse.json({ userId: user.userId });
 *   },
 *   {
 *     requireAuth: true,
 *     allowedRoles: ["SELLER"],
 *     rateLimit: true,
 *     auditAction: "PRODUCT_CREATED",
 *   }
 * );
 * ```
 */
export function withMiddleware<T = unknown>(
  handler: AuthenticatedRouteHandler<T> | RouteHandler<T>,
  options: MiddlewareOptions = {}
): RouteHandler<T> {
  const {
    requireAuth: authRequired = false,
    allowedRoles,
    rateLimit = true,
    rateLimitMax,
    skipRateLimitForRoles,
    auditAction,
    securityHeaders = true,
    csrf = true,
  } = options;

  return async (request, context) => {
    let user: AuthenticatedUser | null = null;

    try {
      // 1. Rate limiting (with role-based bypass)
      if (rateLimit) {
        const tempUser = optionalAuth(request);

        // Check if user's role should bypass rate limiting
        const shouldBypass =
          tempUser && skipRateLimitForRoles?.includes(tempUser.role);

        if (!shouldBypass) {
          const identifier = getRateLimitIdentifier(request, tempUser?.userId);
          const result = apiRateLimiter.tryConsume(identifier, rateLimitMax);

          if (!result.success) {
            const headers = createRateLimitHeaders(result);
            return NextResponse.json(
              {
                success: false,
                error: {
                  code: "RATE_LIMITED",
                  message: "Too many requests. Please try again later.",
                },
              },
              { status: 429, headers }
            );
          }
        }
      }

      // 1.5. CSRF protection (no-op for safe methods)
      if (csrf) {
        const csrfError = await withCsrfProtection(request);
        if (csrfError) return csrfError;
      }

      // 2. Authentication
      if (authRequired) {
        user = requireAuth(request, allowedRoles);
      } else {
        user = optionalAuth(request);
      }

      // 3. Execute handler
      const handlerContext = user ? { ...context, user } : context;

      const response = await (handler as AuthenticatedRouteHandler<T>)(
        request,
        handlerContext as { params: Promise<T>; user: AuthenticatedUser }
      );

      // 4. Security headers
      const finalResponse = securityHeaders
        ? addSecurityHeaders(response)
        : response;

      // 5. Audit logging (async, non-blocking)
      if (auditAction && user) {
        const auditInfo = getAuditInfo(request);
        createAuditLog({
          action: auditAction,
          userId: user.userId,
          userEmail: user.email,
          userRole: user.role,
          ipAddress: auditInfo.ipAddress,
          userAgent: auditInfo.userAgent,
          success: finalResponse.status < 400,
          details: {
            method: request.method,
            path: request.nextUrl.pathname,
            status: finalResponse.status,
          },
        }).catch(() => {
          // Audit logging should never break the request
        });
      }

      return finalResponse;
    } catch (error) {
      // Log failed audit if applicable
      if (auditAction && user) {
        const auditInfo = getAuditInfo(request);
        createAuditLog({
          action: auditAction,
          userId: user.userId,
          userEmail: user.email,
          userRole: user.role,
          ipAddress: auditInfo.ipAddress,
          userAgent: auditInfo.userAgent,
          success: false,
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        }).catch(() => {});
      }

      // Handle auth errors specially
      if (error instanceof AuthError) {
        return error.toResponse();
      }

      return handleError(error, {
        path: request.nextUrl.pathname,
        method: request.method,
        userId: user?.userId,
      });
    }
  };
}

// ============================================================================
// CONVENIENCE WRAPPERS
// ============================================================================

/**
 * Middleware for authenticated routes
 */
export function withAuthMiddleware<T = unknown>(
  handler: AuthenticatedRouteHandler<T>,
  options: Omit<MiddlewareOptions, "requireAuth"> = {}
): RouteHandler<T> {
  return withMiddleware(handler, { ...options, requireAuth: true });
}

/**
 * Middleware for public routes (no auth required)
 */
export function withPublicMiddleware<T = unknown>(
  handler: RouteHandler<T>,
  options: Omit<MiddlewareOptions, "requireAuth" | "allowedRoles"> = {}
): RouteHandler<T> {
  return withMiddleware(handler, { ...options, requireAuth: false });
}

/**
 * Middleware for admin routes (MALL_OWNER only)
 */
export function withAdminMiddleware<T = unknown>(
  handler: AuthenticatedRouteHandler<T>,
  options: Omit<MiddlewareOptions, "requireAuth" | "allowedRoles"> = {}
): RouteHandler<T> {
  return withMiddleware(handler, {
    ...options,
    requireAuth: true,
    allowedRoles: ["MALL_OWNER"],
  });
}

/**
 * Middleware for seller routes
 */
export function withSellerMiddleware<T = unknown>(
  handler: AuthenticatedRouteHandler<T>,
  options: Omit<MiddlewareOptions, "requireAuth" | "allowedRoles"> = {}
): RouteHandler<T> {
  return withMiddleware(handler, {
    ...options,
    requireAuth: true,
    allowedRoles: ["SELLER"],
  });
}
