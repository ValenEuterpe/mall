// src\lib\cron\cleanup-sessions.ts
import { cleanupExpiredSessions as cleanupSessionsService } from "@/lib/auth/session";
import { cleanupExpiredTokens as cleanupTokensService } from "@/lib/auth/email";
import { cleanupOldAuditLogs } from "@/lib/audit/logger";
import { logger } from "@/lib/utils/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface CleanupResult {
    success: boolean;
    count: number;
    error?: unknown;
}

// ============================================================================
// CLEANUP FUNCTIONS
// ============================================================================

/**
 * Clean up expired sessions from the database
 * Removes sessions that have passed their expiration date
 * 
 * @returns Cleanup result with success status and count of deleted sessions
 */
export async function cleanupExpiredSessions(): Promise<CleanupResult> {
    try {
        logger.info("Starting session cleanup...");
        const count = await cleanupSessionsService();
        logger.info(`Cleaned up ${count} expired sessions`);
        return { success: true, count };
    } catch (error) {
        logger.error("Session cleanup failed", error);
        return { success: false, count: 0, error };
    }
}

/**
 * Clean up expired verification tokens from the database
 * Removes tokens used for email verification, password reset, etc.
 * 
 * @returns Cleanup result with success status and count of deleted tokens
 */
export async function cleanupExpiredTokens(): Promise<CleanupResult> {
    try {
        logger.info("Starting token cleanup...");
        const count = await cleanupTokensService();
        logger.info(`Cleaned up ${count} expired tokens`);
        return { success: true, count };
    } catch (error) {
        logger.error("Token cleanup failed", error);
        return { success: false, count: 0, error };
    }
}

/**
 * Clean up old audit logs from the database
 * Removes audit logs older than the specified retention period
 * 
 * @param retentionDays - Number of days to retain logs (default: 90)
 * @returns Cleanup result with success status and count of deleted logs
 */
export async function cleanupAuditLogs(
    retentionDays: number = 90
): Promise<CleanupResult> {
    try {
        logger.info(`Starting audit log cleanup (${retentionDays} days retention)...`);
        const count = await cleanupOldAuditLogs(retentionDays);
        logger.info(`Cleaned up ${count} old audit logs`);
        return { success: true, count };
    } catch (error) {
        logger.error("Audit log cleanup failed", error);
        return { success: false, count: 0, error };
    }
}

/**
 * Run all cleanup tasks in parallel
 * Executes session, token, and audit log cleanup simultaneously
 * 
 * @returns Array of cleanup results for [sessions, tokens, auditLogs]
 */
export async function runAllCleanupTasks(): Promise<
    [CleanupResult, CleanupResult, CleanupResult]
> {
    logger.info("Running all cleanup tasks...");

    const results = await Promise.all([
        cleanupExpiredSessions(),
        cleanupExpiredTokens(),
        cleanupAuditLogs(),
    ]);

    const totalCleaned = results.reduce((sum, result) => sum + result.count, 0);
    logger.info(`All cleanup tasks completed. Total items cleaned: ${totalCleaned}`);

    return results;
}