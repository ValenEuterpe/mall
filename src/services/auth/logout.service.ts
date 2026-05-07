// src/lib/services/auth/logout.service.ts

import { cookies } from "next/headers";
import prisma from "@/lib/db/prisma";
import { deleteUserSessions } from "@/lib/auth/session";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import { logger } from "@/lib/utils/logger";
import type { UserRole, LogoutErrorCode } from "@/types/auth";

const cookieConfig = AUTH_CONFIG.cookies;

// ============================================================================
// COOKIE MANAGEMENT
// ============================================================================

/**
 * Clear all authentication cookies
 */
export async function clearAuthCookies(): Promise<void> {
    const cookieStore = await cookies();

    cookieStore.set(
        cookieConfig.names.accessToken,
        "",
        cookieConfig.clear
    );
    cookieStore.set(
        cookieConfig.names.refreshToken,
        "",
        cookieConfig.clear
    );
}

/**
 * Get authentication tokens from cookies
 */
export async function getAuthTokensFromCookies(): Promise<{
    accessToken: string | undefined;
    refreshToken: string | undefined;
}> {
    const cookieStore = await cookies();

    return {
        accessToken: cookieStore.get(cookieConfig.names.accessToken)?.value,
        refreshToken: cookieStore.get(cookieConfig.names.refreshToken)?.value,
    };
}

// ============================================================================
// SESSION TERMINATION
// ============================================================================

/**
 * Terminate a single session by ID
 */
export async function terminateSession(sessionId: string): Promise<boolean> {
    try {
        await prisma.session.delete({
            where: { id: sessionId },
        });
        return true;
    } catch (error) {
        // Session might already be deleted or expired
        logger.warn("Session could not be deleted", { sessionId, error });
        return false;
    }
}

/**
 * Terminate all sessions for a user
 */
export async function terminateAllUserSessions(
    userId: string,
    role: UserRole
): Promise<boolean> {
    try {
        await deleteUserSessions(userId, role);
        return true;
    } catch (error) {
        logger.error("Failed to terminate all sessions for user", { userId, error });
        throw error;
    }
}

// ============================================================================
// LOGGING
// ============================================================================

/**
 * Log logout event for security monitoring
 */
export function logLogoutEvent(
    userId: string | null,
    ip: string,
    success: boolean,
    allDevices: boolean,
    errorCode?: LogoutErrorCode
): void {
    const logData = {
        event: success ? "logout_success" : "logout_failed",
        userId,
        ip,
        allDevices,
        errorCode,
        timestamp: new Date().toISOString(),
    };

    if (success) {
        logger.info("Logout successful", logData);
    } else {
        logger.warn("Logout issue", logData);
    }
}