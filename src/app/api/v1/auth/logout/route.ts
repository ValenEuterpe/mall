// src/app/api/v1/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";

// Types
import type { LogoutResponse, LogoutOptions, UserRole } from "@/types/auth";

// Utilities
import { getClientIp } from "@/lib/http/request";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { withCsrfProtection } from "@/lib/security/csrf";
import { methodNotAllowed } from "@/app/response";

// Services
import {
    clearAuthCookies,
    getAuthTokensFromCookies,
    terminateSession,
    terminateAllUserSessions,
    logLogoutEvent,
} from "@/services";

// Response Builders
import {
    createLogoutSuccessResponse,
    buildLogoutMessage,
} from "./response-builder";

// ============================================================================
// POST HANDLER
// ============================================================================

/**
 * POST /api/v1/auth/logout
 *
 * Logs out the current user by terminating their session and clearing cookies.
 * Always clears cookies, even if session termination fails.
 */
export async function POST(
    request: NextRequest
): Promise<NextResponse<LogoutResponse>> {
    const csrfError = await withCsrfProtection(request);
    if (csrfError) return csrfError as NextResponse<LogoutResponse>;

    const clientIp = getClientIp(request);
    let userId: string | null = null;

    try {
        // 1. Parse request body for options
        const options = await parseLogoutOptions(request);

        // 2. Get current tokens from cookies
        const { accessToken } = await getAuthTokensFromCookies();

        // 3. Extract session info from token
        const {
            userId: extractedUserId,
            sessionId,
            role
        } = extractTokenInfo(accessToken);

        userId = extractedUserId;

        // 4. Terminate session(s)
        const { sessionTerminated, allSessionsTerminated } =
            await handleSessionTermination(
                userId,
                sessionId,
                role,
                options.allDevices ?? false
            );

        // 5. Clear authentication cookies
        await clearAuthCookies();

        // 6. Log and return success
        logLogoutEvent(userId, clientIp, true, options.allDevices ?? false);

        return createLogoutSuccessResponse(
            {
                sessionTerminated,
                allSessionsTerminated,
                cookiesCleared: true,
            },
            buildLogoutMessage(options.allDevices ?? false)
        );

    } catch (error) {
        console.error("Logout error:", error);

        // Always try to clear cookies even on error
        await safeClearCookies();

        logLogoutEvent(userId, clientIp, false, false, "INTERNAL_ERROR");

        // Return success anyway since cookies are cleared
        return createLogoutSuccessResponse(
            {
                sessionTerminated: false,
                allSessionsTerminated: false,
                cookiesCleared: true,
            },
            "Logged out (session cleanup may have failed)"
        );
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse logout options from request body
 */
async function parseLogoutOptions(request: NextRequest): Promise<LogoutOptions> {
    try {
        const body = await request.json();
        return {
            allDevices: typeof body.allDevices === "boolean"
                ? body.allDevices
                : false,
        };
    } catch {
        return { allDevices: false };
    }
}

/**
 * Extract user and session info from access token
 */
function extractTokenInfo(accessToken: string | undefined): {
    userId: string | null;
    sessionId: string | null;
    role: UserRole;
} {
    if (!accessToken) {
        return { userId: null, sessionId: null, role: "USER" };
    }

    try {
        const tokenPayload = verifyAccessToken(accessToken);
        if (tokenPayload) {
            return {
                userId: tokenPayload.userId,
                sessionId: tokenPayload.sessionId,
                role: tokenPayload.role as UserRole,
            };
        }
    } catch (error) {
        console.warn("Invalid access token during logout:", error);
    }

    return { userId: null, sessionId: null, role: "USER" };
}

/**
 * Handle session termination based on options
 */
async function handleSessionTermination(
    userId: string | null,
    sessionId: string | null,
    role: UserRole,
    allDevices: boolean
): Promise<{ sessionTerminated: boolean; allSessionsTerminated: boolean }> {
    if (!userId) {
        return { sessionTerminated: false, allSessionsTerminated: false };
    }

    try {
        if (allDevices) {
            await terminateAllUserSessions(userId, role);
            return { sessionTerminated: true, allSessionsTerminated: true };
        }

        if (sessionId) {
            const terminated = await terminateSession(sessionId);
            return { sessionTerminated: terminated, allSessionsTerminated: false };
        }
    } catch (error) {
        console.error("Error terminating session(s):", error);
    }

    return { sessionTerminated: false, allSessionsTerminated: false };
}

/**
 * Safely clear cookies with error handling
 */
async function safeClearCookies(): Promise<void> {
    try {
        await clearAuthCookies();
    } catch (cookieError) {
        console.error("Failed to clear cookies during error handling:", cookieError);
    }
}

// ============================================================================
// DELETE HANDLER (Alternative logout method)
// ============================================================================

/**
 * DELETE /api/v1/auth/logout
 *
 * Alternative HTTP method for logout (RESTful convention)
 */
export async function DELETE(
    request: NextRequest
): Promise<NextResponse<LogoutResponse>> {
    return POST(request);
}

// ============================================================================
// UNSUPPORTED METHODS
// ============================================================================

export const GET = () => methodNotAllowed(["POST", "DELETE"]);
export const PUT = () => methodNotAllowed(["POST", "DELETE"]);
export const PATCH = () => methodNotAllowed(["POST", "DELETE"]);
