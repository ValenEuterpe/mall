// src/lib/middleware/auth.ts

import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import {
    refreshSession,
    getAccessTokenCookieOptions,
    getRefreshTokenCookieOptions,
} from "@/services/auth/refresh-session.service";
import type { UserRole, AuthenticatedUser, AuthMiddlewareResult, RoleRestriction } from "@/types/auth";

const routeConfig = AUTH_CONFIG.routes;
const cookieConfig = AUTH_CONFIG.cookies;

// ============================================================================
// PATH MATCHING
// ============================================================================

/**
 * Remove locale prefix from path
 */
function removeLocalePrefix(pathname: string): string {
    const localePattern = /^\/[a-z]{2}(-[A-Z]{2})?(\/|$)/;
    return pathname.replace(localePattern, "/");
}

/**
 * Get locale from path
 */
function getLocaleFromPath(pathname: string): string | null {
    const match = pathname.match(/^\/([a-z]{2}(-[A-Z]{2})?)(\/|$)/);
    return match ? match[1] : null;
}

/**
 * Check if a path matches a pattern
 */
function matchPath(pathname: string, pattern: string): boolean {
    const pathWithoutLocale = removeLocalePrefix(pathname);
    const patternWithoutLocale = removeLocalePrefix(pattern);

    // Exact match
    if (pathWithoutLocale === patternWithoutLocale) {
        return true;
    }

    // Prefix match
    if (pathWithoutLocale.startsWith(patternWithoutLocale + "/")) {
        return true;
    }

    // Wildcard match
    if (pattern.endsWith("/*")) {
        const prefix = pattern.slice(0, -2);
        return pathWithoutLocale.startsWith(prefix);
    }

    return false;
}

/**
 * Check if path is public
 */
export function isPublicPath(pathname: string): boolean {
    return routeConfig.publicPaths.some((path) => matchPath(pathname, path));
}

/**
 * Check if path is protected
 */
export function isProtectedPath(pathname: string): boolean {
    return routeConfig.protectedPaths.some((path) => matchPath(pathname, path));
}

/**
 * Check if path is excluded from middleware
 */
export function isExcludedPath(pathname: string): boolean {
    return routeConfig.excludedPaths.some((path) => pathname.startsWith(path));
}

/**
 * Check if path should redirect when authenticated
 */
export function isAuthRedirectPath(pathname: string): boolean {
    return routeConfig.authRedirectPaths.some((path) => matchPath(pathname, path));
}

/**
 * Get role restriction for path
 */
export function getRoleRestriction(pathname: string): RoleRestriction | null {
    return (
        routeConfig.roleRestrictions.find((restriction) =>
            matchPath(pathname, restriction.pathPattern)
        ) ?? null
    );
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Result of attempting to get/refresh user authentication
 */
export interface AuthAttemptResult {
    user: AuthenticatedUser | null;
    /** New tokens to set if refresh occurred */
    newTokens?: {
        accessToken: string;
        refreshToken?: string;
    };
    /** Whether the user needs to re-login */
    requiresLogin?: boolean;
}

/**
 * Get current user from request cookies
 */
export function getCurrentUser(request: NextRequest): AuthenticatedUser | null {
    const accessToken = request.cookies.get(cookieConfig.names.accessToken)?.value;

    if (!accessToken) {
        return null;
    }

    try {
        return verifyAccessToken(accessToken);
    } catch {
        return null;
    }
}

/**
 * Attempt to get current user, with silent refresh if access token is expired
 * This is the proactive auth function that tries to refresh before giving up
 */
export async function getCurrentUserWithRefresh(
    request: NextRequest
): Promise<AuthAttemptResult> {
    const accessToken = request.cookies.get(cookieConfig.names.accessToken)?.value;
    const refreshTokenValue = request.cookies.get(cookieConfig.names.refreshToken)?.value;

    // 1. Try access token first
    if (accessToken) {
        const user = verifyAccessToken(accessToken);
        if (user) {
            // Access token is valid, no refresh needed
            return { user };
        }
    }

    // 2. Access token missing or invalid - try refresh token
    if (!refreshTokenValue) {
        // No refresh token, user must log in
        return { user: null, requiresLogin: true };
    }

    // 3. Attempt silent refresh
    try {
        const refreshResult = await refreshSession(refreshTokenValue);

        if (!refreshResult.success) {
            // Refresh failed, user must log in
            console.log(`Silent refresh failed: ${refreshResult.code}`);
            return { user: null, requiresLogin: true };
        }

        // 4. Refresh succeeded - return new tokens and user
        return {
            user: {
                userId: refreshResult.user.userId,
                email: refreshResult.user.email,
                role: refreshResult.user.role,
                sessionId: refreshResult.user.sessionId,
            },
            newTokens: {
                accessToken: refreshResult.accessToken,
                refreshToken: refreshResult.refreshToken,
            },
        };
    } catch (error) {
        console.error("Silent refresh error:", error);
        return { user: null, requiresLogin: true };
    }
}

/**
 * Check if user has required role
 */
export function hasRequiredRole(
    user: AuthenticatedUser | null,
    allowedRoles: UserRole[]
): boolean {
    if (!user) return false;
    return allowedRoles.includes(user.role);
}

// ============================================================================
// REDIRECT HELPERS
// ============================================================================

/**
 * Create login redirect URL
 */
export function createLoginRedirect(request: NextRequest): URL {
    const { pathname } = request.nextUrl;
    const locale = getLocaleFromPath(pathname);
    const loginPath = locale
        ? `/${locale}${routeConfig.loginPath}`
        : routeConfig.loginPath;

    const loginUrl = new URL(loginPath, request.url);

    // Add callback URL
    const callbackPath = removeLocalePrefix(pathname);
    if (callbackPath !== "/" && callbackPath !== routeConfig.loginPath) {
        loginUrl.searchParams.set("callbackUrl", pathname);
    }

    return loginUrl;
}

/**
 * Create role-based redirect URL
 */
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

/**
 * Create authenticated user redirect (away from login pages)
 */
export function createAuthenticatedRedirect(
    request: NextRequest,
    user: AuthenticatedUser
): URL {
    const { pathname, searchParams } = request.nextUrl;
    const locale = getLocaleFromPath(pathname);

    // Check for callback URL
    const callbackUrl = searchParams.get("callbackUrl");
    if (callbackUrl) {
        return new URL(callbackUrl, request.url);
    }

    // Role-based default redirects
    const redirectPath =
        routeConfig.roleDashboards[user.role] ??
        routeConfig.defaultAuthenticatedPath;
    const localizedPath = locale ? `/${locale}${redirectPath}` : redirectPath;

    return new URL(localizedPath, request.url);
}

// ============================================================================
// MAIN MIDDLEWARE FUNCTION
// ============================================================================

/**
 * Process authentication for a request
 * Now with proactive token refresh - if access token is expired but refresh token is valid,
 * we silently refresh and continue without redirecting to login.
 */
export async function processAuth(
    request: NextRequest
): Promise<AuthMiddlewareResult> {
    const { pathname, searchParams } = request.nextUrl;

    // Allow Mall Owner magic-link verification screen to load without a session.
    // The page itself will exchange `token + password` for session cookies.
    const pathWithoutLocale = removeLocalePrefix(pathname);
    const isMallOwnerMagicLinkCallback =
        pathWithoutLocale === "/mall-owner/dashboard" && Boolean(searchParams.get("token"));

    // 1. Skip excluded paths
    if (isExcludedPath(pathname)) {
        return {
            authenticated: false,
            user: null,
            shouldRedirect: false,
        };
    }

    // 2. Get current user WITH proactive refresh
    // This will try refresh token if access token is expired
    const authAttempt = await getCurrentUserWithRefresh(request);
    const user = authAttempt.user;
    const authenticated = user !== null;
    const newTokens = authAttempt.newTokens;

    // 3. Handle auth redirect paths (login, signup)
    if (isAuthRedirectPath(pathname) && user !== null) {
        return {
            authenticated: true,
            user,
            shouldRedirect: true,
            redirectUrl: createAuthenticatedRedirect(request, user).toString(),
            newTokens,
        };
    }

    // 4. Handle public paths
    if (isPublicPath(pathname)) {
        return {
            authenticated,
            user,
            shouldRedirect: false,
            newTokens,
        };
    }

    // 5. Handle protected paths
    if (isProtectedPath(pathname)) {
        if (!authenticated) {
            // Special case: allow unauthenticated access to the mall-owner dashboard ONLY when
            // the request includes a magic-link token.
            if (isMallOwnerMagicLinkCallback) {
                return {
                    authenticated: false,
                    user: null,
                    shouldRedirect: false,
                };
            }

            return {
                authenticated: false,
                user: null,
                shouldRedirect: true,
                redirectUrl: createLoginRedirect(request).toString(),
            };
        }

        // Check role restrictions
        const restriction = getRoleRestriction(pathname);
        if (restriction && !hasRequiredRole(user, restriction.allowedRoles)) {
            return {
                authenticated: true,
                user,
                shouldRedirect: true,
                redirectUrl: createRoleRedirect(request, restriction).toString(),
                newTokens,
            };
        }
    }

    // 6. Check role restrictions for non-explicitly-protected paths
    const restriction = getRoleRestriction(pathname);
    if (restriction) {
        if (!authenticated) {
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
                newTokens,
            };
        }
    }

    return {
        authenticated,
        user,
        shouldRedirect: false,
        newTokens,
    };
}

// ============================================================================
// RESPONSE HEADERS
// ============================================================================

/**
 * Add user context to response headers
 */
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