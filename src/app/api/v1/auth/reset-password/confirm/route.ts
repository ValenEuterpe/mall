// src/app/api/v1/auth/password/reset/route.ts

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/prisma/generated/client";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import type {
    PasswordResetResponse,
    TokenValidationResponse,
    UserRole,
} from "@/types/auth";
import { passwordResetSchema } from "@/lib/validation/schemas/auth";
import { getClientIp } from "@/lib/http/request";
import { ensureMinResponseTime } from "@/lib/security/timing";
import {
    verifyPasswordResetToken,
    validatePasswordResetToken,
} from "@/lib/auth/email";
import { methodNotAllowed } from "@/app/response";
import { findFoundAccountByEmail } from "@/services/auth/account.service";
import {
    updateAccountPassword,
    invalidateAccountSessions,
    sendPasswordChangeNotification,
    mapTokenErrorToResponse,
    logPasswordResetEvent,
    checkAccountActiveForReset,
} from "@/services";

// Response Builders
import {
    createPasswordResetErrorResponse,
    createPasswordResetSuccessResponse,
    createTokenValidationSuccessResponse,
} from "./response-builder";



const config = AUTH_CONFIG.passwordReset;

// ============================================================================
// POST HANDLER
// ============================================================================

/**
 * POST /api/v1/auth/password/reset
 *
 * Resets the user's password using a valid reset token.
 */
export async function POST(
    request: NextRequest
): Promise<NextResponse<PasswordResetResponse>> {
    const startTime = Date.now();
    const clientIp = getClientIp(request);
    let email: string | null = null;
    let role: UserRole | null = null;

    try {
        // 1. Parse and validate request body
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createPasswordResetErrorResponse(
                "VALIDATION_ERROR",
                "Invalid JSON in request body",
                400
            );
        }

        const validationResult = passwordResetSchema.safeParse(body);
        if (!validationResult.success) {
            await ensureMinResponseTime(startTime, config.minResponseTime);

            const formattedErrors = validationResult.error.issues.map((err) => ({
                field: err.path.join("."),
                message: err.message,
            }));
            const firstError = formattedErrors[0];

            return createPasswordResetErrorResponse(
                "VALIDATION_ERROR",
                firstError?.message ?? "Please check your input and try again",
                400,
                { field: firstError?.field, details: formattedErrors }
            );
        }

        const { token, password } = validationResult.data;

        logPasswordResetEvent("started", null, clientIp, null);

        // 2. Verify the reset token
        const tokenResult = await verifyPasswordResetToken(token);

        if (!tokenResult.valid) {
            const errorInfo = mapTokenErrorToResponse(tokenResult.error);
            logPasswordResetEvent("failed", null, clientIp, null, {
                reason: tokenResult.error,
            });
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createPasswordResetErrorResponse(
                errorInfo.code,
                errorInfo.message,
                errorInfo.status
            );
        }

        email = tokenResult.email;

        // 3. Find the account
        const account = await findFoundAccountByEmail(email);

        if (!account) {
            logPasswordResetEvent("failed", email, clientIp, null, {
                reason: "ACCOUNT_NOT_FOUND",
            });
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createPasswordResetErrorResponse(
                "ACCOUNT_NOT_FOUND",
                "No account found. The account may have been deleted.",
                404
            );
        }

        role = account.type;

        // 4. Check if account is active
        const statusCheck = checkAccountActiveForReset(account);
        if (!statusCheck.valid) {
            logPasswordResetEvent("failed", email, clientIp, role, {
                reason: statusCheck.code,
            });
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createPasswordResetErrorResponse(
                statusCheck.code,
                statusCheck.message,
                statusCheck.status
            );
        }

        // 5. Update the password
        await updateAccountPassword(account, password);

        // 6. Invalidate all existing sessions
        const sessionsInvalidated = await invalidateAccountSessions(
            account.id,
            role
        );

        // 7. Send password change notification (non-blocking)
        sendPasswordChangeNotification(account.email, account.displayName, clientIp);

        // 8. Log success and return
        logPasswordResetEvent("completed", email, clientIp, role, {
            accountId: account.id,
            sessionsInvalidated,
        });

        await ensureMinResponseTime(startTime, config.minResponseTime);
        return createPasswordResetSuccessResponse(email, role, sessionsInvalidated);

    } catch (error) {
        await ensureMinResponseTime(startTime, config.minResponseTime);
        return handleError(error, email, clientIp, role);
    }
}

// ============================================================================
// GET HANDLER
// ============================================================================

/**
 * GET /api/v1/auth/password/reset?token=xxx
 *
 * Validates a password reset token without consuming it.
 */
export async function GET(
    request: NextRequest
): Promise<NextResponse<TokenValidationResponse>> {
    const startTime = Date.now();

    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get("token");

        if (!token) {
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createPasswordResetErrorResponse(
                "VALIDATION_ERROR",
                "Reset token is required",
                400
            );
        }

        // Validate token without consuming it
        const tokenResult = await validatePasswordResetToken(token);

        if (!tokenResult.valid) {
            const errorInfo = mapTokenErrorToResponse(tokenResult.error);
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createPasswordResetErrorResponse(
                errorInfo.code,
                errorInfo.message,
                errorInfo.status
            );
        }

        // Find account to verify it still exists
        const account = await findFoundAccountByEmail(tokenResult.email);

        if (!account) {
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createPasswordResetErrorResponse(
                "ACCOUNT_NOT_FOUND",
                "No account found for this reset link.",
                404
            );
        }

        const statusCheck = checkAccountActiveForReset(account);
        if (!statusCheck.valid) {
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createPasswordResetErrorResponse(
                statusCheck.code,
                statusCheck.message,
                statusCheck.status
            );
        }

        await ensureMinResponseTime(startTime, config.minResponseTime);
        return createTokenValidationSuccessResponse(tokenResult.email);

    } catch (error) {
        console.error("Token validation error:", error);
        await ensureMinResponseTime(startTime, config.minResponseTime);
        return createPasswordResetErrorResponse(
            "INTERNAL_ERROR",
            "Unable to validate reset link. Please try again.",
            500
        );
    }
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

function handleError(
    error: unknown,
    email: string | null,
    clientIp: string,
    role: UserRole | null
): NextResponse<PasswordResetResponse> {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error("Database error during password reset:", error.code, error.message);
        logPasswordResetEvent("failed", email, clientIp, role, {
            reason: "DATABASE_ERROR",
            errorCode: error.code,
        });
        return createPasswordResetErrorResponse(
            "DATABASE_ERROR",
            "A database error occurred. Please try again later.",
            500
        );
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
        console.error("Database connection error:", error.message);
        logPasswordResetEvent("failed", email, clientIp, role, {
            reason: "DATABASE_CONNECTION_ERROR",
        });
        return createPasswordResetErrorResponse(
            "DATABASE_ERROR",
            "Unable to connect to the database. Please try again later.",
            503
        );
    }

    console.error("Unexpected password reset error:", error);
    logPasswordResetEvent("failed", email, clientIp, role, {
        reason: "INTERNAL_ERROR",
        error: error instanceof Error ? error.message : "Unknown",
    });
    return createPasswordResetErrorResponse(
        "INTERNAL_ERROR",
        "An unexpected error occurred. Please try again later.",
        500
    );
}

// ============================================================================
// UNSUPPORTED METHODS
// ============================================================================

export const PUT = () => methodNotAllowed(["GET", "POST"]);
export const DELETE = () => methodNotAllowed(["GET", "POST"]);
export const PATCH = () => methodNotAllowed(["GET", "POST"]);