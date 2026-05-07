// middleware.ts (root of project)

import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";
import { NextRequest, NextResponse } from "next/server";
import {
    processAuth,
    addUserContextHeaders,
} from "./src/lib/middleware/auth";
import {
    getAccessTokenCookieOptions,
    getRefreshTokenCookieOptions,
} from "./src/services/auth/refresh-session.service";

// I18N MIDDLEWARE

const intlMiddleware = createMiddleware(routing);

// SKIP PATTERNS

/**
 * Patterns to skip middleware entirely
 */
const SKIP_PATTERNS = [
    // API routes (handled separately)
    /^\/api\//,
    // Next.js internals
    /^\/_next\//,
    // Static files
    /\.(ico|png|jpg|jpeg|gif|svg|webp|mp4|webm|mp3|wav|pdf|doc|docx|xls|xlsx|zip|rar)$/i,
    // Public assets
    /^\/uploads\//,
    /^\/images\//,
    /^\/fonts\//,
    // Common static files
    /^\/robots\.txt$/,
    /^\/sitemap\.xml$/,
    /^\/manifest\.json$/,
    /^\/browserconfig\.xml$/,
    /^\/favicon/,
];

/**
 * Check if middleware should be skipped
 */
function shouldSkipMiddleware(pathname: string): boolean {
    return SKIP_PATTERNS.some((pattern) => pattern.test(pathname));
}

// MIDDLEWARE

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Skip middleware for static files and API routes
    if (shouldSkipMiddleware(pathname)) {
        return NextResponse.next();
    }

    // 2. Process authentication (with proactive token refresh)
    const authResult = await processAuth(request);

    // 3. Handle redirects
    if (authResult.shouldRedirect && authResult.redirectUrl) {
        const redirectResponse = NextResponse.redirect(authResult.redirectUrl);
        
        // Set new tokens on redirect response if refresh occurred
        if (authResult.newTokens) {
            setAuthCookies(redirectResponse, authResult.newTokens);
        }
        
        return redirectResponse;
    }

    // 4. Run i18n middleware
    const response = intlMiddleware(request);

    // 5. Set new tokens if silent refresh occurred
    if (authResult.newTokens) {
        setAuthCookies(response, authResult.newTokens);
    }

    // 6. Add user context to response headers
    if (authResult.user) {
        addUserContextHeaders(response, authResult.user);
    }

    return response;
}

/**
 * Helper to set auth cookies on a response
 */
function setAuthCookies(
    response: NextResponse,
    tokens: { accessToken: string; refreshToken?: string }
): void {
    const accessTokenOptions = getAccessTokenCookieOptions();
    const refreshTokenOptions = getRefreshTokenCookieOptions();

    // Set the new access token
    response.cookies.set("access_token", tokens.accessToken, accessTokenOptions);

    // Set new refresh token if rotation occurred
    if (tokens.refreshToken) {
        response.cookies.set("refresh_token", tokens.refreshToken, refreshTokenOptions);
    }
}

// MATCHER CONFIGURATION

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - api (API routes - handled by route-level auth)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files with extensions
         */
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
    ],
};