// src/lib/services/auth/user-login.service.ts

import prisma from "@/lib/db/prisma";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import { maskEmail } from "@/lib/utils/email";
import { logger } from "@/lib/utils/logger";
import type { UserAccountRecord, UserLoginErrorCode } from "@/types/auth";

const config = AUTH_CONFIG.login;

// ============================================================================
// ACCOUNT LOOKUP
// ============================================================================

//Find user by email
export async function findUserByEmail(
    email: string
): Promise<UserAccountRecord | null> {
    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            password: true,
            firstName: true,
            lastName: true,
            emailVerified: true,
            isActive: true,
            failedLoginAttempts: true,
            lockedUntil: true,
            lastLoginAt: true,
        },
    });

    if (!user) return null;

    // we keep the interface as boolean, 
    // you convert the Date to a boolean here:
    return {
        ...user,
        emailVerified: !!user.emailVerified, // Converts Date to true, null to false
    } as UserAccountRecord;
}

// ============================================================================
// ACCOUNT STATUS CHECKS
// ============================================================================

export interface UserStatusError {
    valid: false;
    code: UserLoginErrorCode;
    message: string;
    status: number;
    retryAfter?: number;
}

export interface UserStatusValid {
    valid: true;
}

export type UserStatusResult = UserStatusValid | UserStatusError;

/**
 * Check if user account is locked
 */
export function checkUserLockStatus(user: UserAccountRecord): UserStatusResult {
    if (user.lockedUntil && user.lockedUntil > new Date()) {
        const retryAfter = Math.ceil(
            (user.lockedUntil.getTime() - Date.now()) / 1000
        );
        return {
            valid: false,
            code: "ACCOUNT_LOCKED",
            message: "Account is temporarily locked due to too many failed login attempts",
            status: 429,
            retryAfter,
        };
    }
    return { valid: true };
}

/**
 * Check if user email is verified
 */
export function checkEmailVerification(user: UserAccountRecord): UserStatusResult {
    if (!user.emailVerified) {
        return {
            valid: false,
            code: "EMAIL_NOT_VERIFIED",
            message: "Please verify your email address before logging in",
            status: 403,
        };
    }
    return { valid: true };
}

/**
 * Check if user account is active
 */
export function checkUserActiveStatus(user: UserAccountRecord): UserStatusResult {
    if (!user.isActive) {
        return {
            valid: false,
            code: "ACCOUNT_DISABLED",
            message: "Your account has been disabled. Please contact support.",
            status: 403,
        };
    }
    return { valid: true };
}

// ============================================================================
// FAILED ATTEMPTS MANAGEMENT
// ============================================================================

/**
 * Handle failed password attempt for user
 * Returns true if account should be locked
 */
export async function handleUserFailedAttempt(
    user: UserAccountRecord
): Promise<{ shouldLock: boolean; newAttempts: number }> {
    if (!config.trackFailedAttempts) {
        return { shouldLock: false, newAttempts: 0 };
    }

    const newAttempts = (user.failedLoginAttempts ?? 0) + 1;
    const shouldLock = newAttempts >= config.maxFailedAttempts;

    await prisma.user.update({
        where: { id: user.id },
        data: {
            failedLoginAttempts: newAttempts,
            ...(shouldLock && {
                lockedUntil: new Date(
                    Date.now() + config.lockoutDurationMinutes * 60 * 1000
                ),
            }),
        },
    });

    return { shouldLock, newAttempts };
}

// ============================================================================
// LOGIN METADATA
// ============================================================================

/**
 * Update user login metadata after successful login
 */
export async function updateUserLoginMetadata(
    userId: string,
    clientIp: string
): Promise<void> {
    await prisma.user.update({
        where: { id: userId },
        data: {
            lastLoginAt: new Date(),
            lastLoginIp: clientIp !== "unknown" ? clientIp : null,
            failedLoginAttempts: 0,
            lockedUntil: null,
        },
    });
}

// ============================================================================
// LOGGING
// ============================================================================

/**
 * Log user login attempt for security monitoring
 */
export function logUserLoginAttempt(
    email: string,
    ip: string,
    success: boolean,
    errorCode?: UserLoginErrorCode,
    userId?: string
): void {
    const logData = {
        event: success ? "user_login_success" : "user_login_failed",
        email: maskEmail(email),
        userId: userId ?? null,
        ip,
        errorCode,
        timestamp: new Date().toISOString(),
    };

    if (success) {
        logger.info("User login successful", logData);
    } else {
        logger.warn("User login failed", logData);
    }
}