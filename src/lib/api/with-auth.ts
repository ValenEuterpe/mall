// src/lib/api/with-auth.ts

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/prisma/generated/client";
import { requireAuth, AuthError, getRequestContext } from "./auth-helper";
import type { UserRole, AuthenticatedUser } from "@/types/auth";

// ============================================================================
// TYPES
// ============================================================================

type NextRouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse> | NextResponse;

type AuthenticatedHandler = (
  request: NextRequest,
  context: {
    params: Promise<Record<string, string>>;
    user: AuthenticatedUser;
  }
) => Promise<NextResponse> | NextResponse;

interface WithAuthOptions {
  /** Required roles (any of these roles is allowed) */
  roles?: UserRole[];
  /** Whether to log request details */
  logging?: boolean;
}

// ============================================================================
// HIGHER-ORDER FUNCTION
// ============================================================================

/**
 * Wrap an API route handler with authentication
 *
 * @example
 * ```ts
 * // Require any authenticated user
 * export const GET = withAuth(async (request, { user }) => {
 *   return NextResponse.json({ userId: user.userId });
 * });
 *
 * // Require specific roles
 * export const POST = withAuth(
 *   async (request, { user }) => {
 *     return NextResponse.json({ seller: user.userId });
 *   },
 *   { roles: ["SELLER", "MALL_OWNER"] }
 * );
 * ```
 */
export function withAuth(
  handler: AuthenticatedHandler,
  options: WithAuthOptions = {}
): NextRouteHandler {
  return async (request, context) => {
    const { roles, logging = process.env.NODE_ENV === "development" } = options;

    try {
      // Authenticate
      const user = requireAuth(request, roles);

      // Log if enabled
      if (logging) {
        const reqContext = getRequestContext(request);
        console.log(`[AUTH] ${reqContext.method} ${reqContext.path}`, {
          userId: user.userId,
          role: user.role,
          ip: reqContext.ip,
        });
      }

      // Call handler with user context
      return await handler(request, { ...context, user });
    } catch (error) {
      // Handle auth errors
      if (error instanceof AuthError) {
        return error.toResponse();
      }

      // Handle Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error("Database error:", error.code, error.message);
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DATABASE_ERROR",
              message: "A database error occurred",
            },
          },
          { status: 500 }
        );
      }

      // Handle unknown errors
      console.error("Unexpected error in authenticated route:", error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred",
          },
        },
        { status: 500 }
      );
    }
  };
}

// ============================================================================
// ROLE-SPECIFIC WRAPPERS
// ============================================================================

/**
 * Wrapper for user-only routes
 */
export function withUserAuth(handler: AuthenticatedHandler): NextRouteHandler {
  return withAuth(handler, { roles: ["USER"] });
}

/**
 * Wrapper for seller-only routes
 */
export function withSellerAuth(
  handler: AuthenticatedHandler
): NextRouteHandler {
  return withAuth(handler, { roles: ["SELLER"] });
}

/**
 * Wrapper for mall owner-only routes
 */
export function withMallOwnerAuth(
  handler: AuthenticatedHandler
): NextRouteHandler {
  return withAuth(handler, { roles: ["MALL_OWNER"] });
}

/**
 * Wrapper for admin routes (mall owner)
 */
export function withAdminAuth(handler: AuthenticatedHandler): NextRouteHandler {
  return withAuth(handler, { roles: ["MALL_OWNER"] });
}

/**
 * Wrapper for routes accessible by sellers and mall owners
 */
export function withSellerOrAdminAuth(
  handler: AuthenticatedHandler
): NextRouteHandler {
  return withAuth(handler, { roles: ["SELLER", "MALL_OWNER"] });
}

/**
 * Wrapper for routes accessible by sellers (formerly also advertisers)
 */
export function withBusinessAuth(
  handler: AuthenticatedHandler
): NextRouteHandler {
  return withAuth(handler, { roles: ["SELLER"] });
}
