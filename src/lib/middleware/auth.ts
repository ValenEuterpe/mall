// src/lib/middleware/auth.ts
//
// Edge-runtime auth helpers used by middleware.ts.
//
// Constraint: this module MUST stay free of Node-only or DB-bound imports
// (no Prisma, no `jsonwebtoken`, no `@/services/auth/*`). Vercel's edge
// middleware bundle is capped at ~1 MB compressed, and pulling Prisma in
// drags a 3.5 MB query-engine WASM with it.
//
// Token model: middleware verifies the *access* JWT only (via `jose`).
// When the access token is missing or invalid but a refresh-token cookie is
// present, middleware redirects to a Node-runtime route (/api/auth/refresh)
// that performs the DB-backed session refresh and bounces back to the
// original URL. One extra hop on token expiry (~every 15 min).

import { NextRequest, NextResponse } from "next/server";
import { verifyAccessTokenEdge } from "@/lib/auth/tokens-edge";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import type {
  UserRole,
  AuthenticatedUser,
  AuthMiddlewareResult,
  RoleRestriction,
} from "@/types/auth";

const routeConfig = AUTH_CONFIG.routes;
const cookieConfig = AUTH_CONFIG.cookies;

// PATH MATCHING

function removeLocalePrefix(pathname: string): string {
  const localePattern = /^\/[a-z]{2}(-[A-Z]{2})?(\/|$)/;
  return pathname.replace(localePattern, "/");
}

function getLocaleFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/([a-z]{2}(-[A-Z]{2})?)(\/|$)/);
  return match ? match[1] : null;
}

function matchPath(pathname: string, pattern: string): boolean {
  const pathWithoutLocale = removeLocalePrefix(pathname);
  const patternWithoutLocale = removeLocalePrefix(pattern);

  if (pathWithoutLocale === patternWithoutLocale) return true;
  if (pathWithoutLocale.startsWith(patternWithoutLocale + "/")) return true;
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -2);
    return pathWithoutLocale.startsWith(prefix);
  }
  return false;
}

export function isPublicPath(pathname: string): boolean {
  return routeConfig.publicPaths.some((path) => matchPath(pathname, path));
}

export function isProtectedPath(pathname: string): boolean {
  return routeConfig.protectedPaths.some((path) => matchPath(pathname, path));
}

export function isExcludedPath(pathname: string): boolean {
  return routeConfig.excludedPaths.some((path) => pathname.startsWith(path));
}

export function isAuthRedirectPath(pathname: string): boolean {
  return routeConfig.authRedirectPaths.some((path) =>
    matchPath(pathname, path)
  );
}

export function getRoleRestriction(pathname: string): RoleRestriction | null {
  return (
    routeConfig.roleRestrictions.find((restriction) =>
      matchPath(pathname, restriction.pathPattern)
    ) ?? null
  );
}

// AUTHENTICATION (edge-safe — JWT verify only, no DB)

/**
 * Verify the access token cookie. Returns the user payload or null.
 * Pure edge-safe: uses jose (Web Crypto), no DB.
 */
export async function getCurrentUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  const accessToken = request.cookies.get(
    cookieConfig.names.accessToken
  )?.value;
  if (!accessToken) return null;

  const payload = await verifyAccessTokenEdge(accessToken);
  if (!payload) return null;

  return {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    sessionId: payload.sessionId,
  };
}

export function hasRequiredRole(
  user: AuthenticatedUser | null,
  allowedRoles: UserRole[]
): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

// REDIRECT HELPERS

export function createLoginRedirect(request: NextRequest): URL {
  const { pathname } = request.nextUrl;
  const locale = getLocaleFromPath(pathname);
  const loginPath = locale
    ? `/${locale}${routeConfig.loginPath}`
    : routeConfig.loginPath;

  const loginUrl = new URL(loginPath, request.url);
  const callbackPath = removeLocalePrefix(pathname);
  if (callbackPath !== "/" && callbackPath !== routeConfig.loginPath) {
    loginUrl.searchParams.set("callbackUrl", pathname);
  }
  return loginUrl;
}

/**
 * Build a redirect to the Node-runtime refresh endpoint, preserving the
 * originally requested path (locale included) as `callbackUrl`.
 */
function createRefreshRedirect(request: NextRequest): URL {
  const refreshUrl = new URL("/api/auth/refresh", request.url);
  const { pathname, search } = request.nextUrl;
  refreshUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
  return refreshUrl;
}

export function createRoleRedirect(
  request: NextRequest,
  restriction: RoleRestriction
): URL {
  const { pathname } = request.nextUrl;
  const locale = getLocaleFromPath(pathname);
  const redirectPath = restriction.redirectPath ?? "/";
  const localizedPath = locale ? `/${locale}${redirectPath}` : redirectPath;
  return new URL(localizedPath, request.url);
}

export function createAuthenticatedRedirect(
  request: NextRequest,
  user: AuthenticatedUser
): URL {
  const { pathname, searchParams } = request.nextUrl;
  const locale = getLocaleFromPath(pathname);

  const callbackUrl = searchParams.get("callbackUrl");
  if (callbackUrl) {
    return new URL(callbackUrl, request.url);
  }

  const redirectPath =
    routeConfig.roleDashboards[user.role] ??
    routeConfig.defaultAuthenticatedPath;
  const localizedPath = locale ? `/${locale}${redirectPath}` : redirectPath;
  return new URL(localizedPath, request.url);
}

// MAIN MIDDLEWARE FUNCTION

/**
 * Process authentication for a request (edge-safe).
 *
 * Behaviour summary:
 * - Excluded paths skip auth.
 * - Valid access token → authenticated.
 * - Invalid/missing access token + refresh cookie + non-auth-redirect path
 *   → redirect to /api/auth/refresh (which does the DB refresh in Node runtime).
 * - No refresh cookie → unauthenticated; protected paths bounce to login.
 */
export async function processAuth(
  request: NextRequest
): Promise<AuthMiddlewareResult> {
  const { pathname, searchParams } = request.nextUrl;

  const pathWithoutLocale = removeLocalePrefix(pathname);
  const isMallOwnerMagicLinkCallback =
    pathWithoutLocale === "/mall-owner/dashboard" &&
    Boolean(searchParams.get("token"));

  // 1. Skip excluded paths
  if (isExcludedPath(pathname)) {
    return { authenticated: false, user: null, shouldRedirect: false };
  }

  // 2. Verify the access token (edge-safe)
  const user = await getCurrentUser(request);
  const authenticated = user !== null;
  const hasRefreshCookie = Boolean(
    request.cookies.get(cookieConfig.names.refreshToken)?.value
  );

  // 3. Auth-redirect paths (login, signup) — bounce signed-in users away.
  //    Do NOT route through /api/auth/refresh here: a logged-out user
  //    landing on /login with a stale refresh cookie should just see /login.
  if (isAuthRedirectPath(pathname)) {
    if (user) {
      return {
        authenticated: true,
        user,
        shouldRedirect: true,
        redirectUrl: createAuthenticatedRedirect(request, user).toString(),
      };
    }
    return { authenticated: false, user: null, shouldRedirect: false };
  }

  // 4. Public paths
  if (isPublicPath(pathname)) {
    // If access token expired but refresh exists, opportunistically refresh
    // so signed-in users get their identity back without an extra reload.
    // (Optional — skip for /, since the homepage works fine anonymously.)
    if (!authenticated && hasRefreshCookie && pathWithoutLocale !== "/") {
      return {
        authenticated: false,
        user: null,
        shouldRedirect: true,
        redirectUrl: createRefreshRedirect(request).toString(),
      };
    }
    return { authenticated, user, shouldRedirect: false };
  }

  // 5. Protected paths
  if (isProtectedPath(pathname)) {
    if (!authenticated) {
      // Magic-link callback: allow unauthenticated access when the URL
      // carries a one-time token.
      if (isMallOwnerMagicLinkCallback) {
        return { authenticated: false, user: null, shouldRedirect: false };
      }

      // Try silent refresh in Node runtime if refresh cookie exists.
      if (hasRefreshCookie) {
        return {
          authenticated: false,
          user: null,
          shouldRedirect: true,
          redirectUrl: createRefreshRedirect(request).toString(),
        };
      }

      return {
        authenticated: false,
        user: null,
        shouldRedirect: true,
        redirectUrl: createLoginRedirect(request).toString(),
      };
    }

    const restriction = getRoleRestriction(pathname);
    if (restriction && !hasRequiredRole(user, restriction.allowedRoles)) {
      return {
        authenticated: true,
        user,
        shouldRedirect: true,
        redirectUrl: createRoleRedirect(request, restriction).toString(),
      };
    }
  }

  // 6. Role restrictions on non-explicitly-protected paths
  const restriction = getRoleRestriction(pathname);
  if (restriction) {
    if (!authenticated) {
      if (hasRefreshCookie) {
        return {
          authenticated: false,
          user: null,
          shouldRedirect: true,
          redirectUrl: createRefreshRedirect(request).toString(),
        };
      }
      return {
        authenticated: false,
        user: null,
        shouldRedirect: true,
        redirectUrl: createLoginRedirect(request).toString(),
      };
    }

    if (!hasRequiredRole(user, restriction.allowedRoles)) {
      return {
        authenticated: true,
        user,
        shouldRedirect: true,
        redirectUrl: createRoleRedirect(request, restriction).toString(),
      };
    }
  }

  return { authenticated, user, shouldRedirect: false };
}

// RESPONSE HEADERS

export function addUserContextHeaders(
  response: NextResponse,
  user: AuthenticatedUser | null
): NextResponse {
  if (user) {
    response.headers.set("x-user-id", user.userId);
    response.headers.set("x-user-role", user.role);
    response.headers.set("x-user-email", user.email);
    response.headers.set("x-session-id", user.sessionId);
  }
  return response;
}
