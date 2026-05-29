// src/app/api/v1/auth/password/forgot/route.ts

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/prisma/generated/client";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import type { PasswordResetRequestResponse } from "@/types/auth";
import { passwordResetRequestSchema } from "@/lib/validation/schemas/auth";
import { normalizeEmail } from "@/lib/utils/email";
import { getClientIp } from "@/lib/http/request";
import { ensureMinResponseTime } from "@/lib/security/timing";
import { createPasswordResetToken, getVerificationUrl } from "@/lib/auth/email";
import { sendPasswordResetEmail, dispatch } from "@/lib/email/send";
import { methodNotAllowed } from "@/app/response";
import {
    findFoundAccountByEmail,
    logPasswordResetRequestEvent,
} from "@/services";
import {
    createPasswordResetRequestErrorResponse,
    createGenericPasswordResetRequestSuccessResponse,
} from "./response-builder";

const config = AUTH_CONFIG.passwordReset;

// ============================================================================
// POST HANDLER
// ============================================================================

/**
 * POST /api/v1/auth/password/forgot
 *
 * Requests a password reset link for any account type.
 * Always returns success to prevent email enumeration.
 */
export async function POST(
    request: NextRequest
): Promise<NextResponse<PasswordResetRequestResponse>> {
    const startTime = Date.now();
    const clientIp = getClientIp(request);
    let email = "";

    try {
        // 1. Parse and validate request body
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createPasswordResetRequestErrorResponse(
                "VALIDATION_ERROR",
                "Invalid JSON in request body",
                400
            );
        }

        const validationResult = passwordResetRequestSchema.safeParse(body);
        if (!validationResult.success) {
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createPasswordResetRequestErrorResponse(
                "VALIDATION_ERROR",
                "Please provide a valid email address",
                400,
                {
                    details: validationResult.error.issues.map((issue) => ({
                        field: issue.path.join("."),
                        message: issue.message,
                    })),
                }
            );
        }

        email = normalizeEmail(validationResult.data.email);
        logPasswordResetRequestEvent("requested", email, clientIp, null);

        // 2. Find account by email
        const account = await findFoundAccountByEmail(email);

        // 3. Handle non-existent account (return generic success)
        if (!account) {
            logPasswordResetRequestEvent("not_found", email, clientIp, null);
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createGenericPasswordResetRequestSuccessResponse();
        }

        // 4. Check if account is active
        if (!account.isActive) {
            logPasswordResetRequestEvent("failed", email, clientIp, account.type, {
                reason: "ACCOUNT_DISABLED",
            });
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createGenericPasswordResetRequestSuccessResponse();
        }

        // 5. Create password reset token
        const tokenResult = await createPasswordResetToken(email);

        if (!tokenResult.success) {
            if (tokenResult.error === "RATE_LIMITED") {
                logPasswordResetRequestEvent("failed", email, clientIp, account.type, {
                    reason: "RATE_LIMITED",
                    retryAfter: tokenResult.retryAfter,
                });
                await ensureMinResponseTime(startTime, config.minResponseTime);
                return createPasswordResetRequestErrorResponse(
                    "RATE_LIMITED",
                    "Please wait before requesting another password reset link.",
                    429,
                    { retryAfter: tokenResult.retryAfter }
                );
            }

            logPasswordResetRequestEvent("failed", email, clientIp, account.type, {
                reason: "TOKEN_CREATION_FAILED",
                error: tokenResult.error,
            });
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createGenericPasswordResetRequestSuccessResponse();
        }

        // 6. Send password reset email (detached — failures logged to Sentry)
        const resetUrl = getVerificationUrl(tokenResult.token, "reset");
        dispatch(() => sendPasswordResetEmail(email, resetUrl));

        // 7. Log success and return
        logPasswordResetRequestEvent("sent", email, clientIp, account.type, {
            accountId: account.id,
            expiresAt: tokenResult.expiresAt.toISOString(),
        });

        await ensureMinResponseTime(startTime, config.minResponseTime);
        return createGenericPasswordResetRequestSuccessResponse();

    } catch (error) {
        await ensureMinResponseTime(startTime, config.minResponseTime);
        return handleError(error, email, clientIp);
    }
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

function handleError(
    error: unknown,
    email: string,
    clientIp: string
): NextResponse<PasswordResetRequestResponse> {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error("Database error during password reset request:", error.code, error.message);
        logPasswordResetRequestEvent("failed", email, clientIp, null, {
            reason: "DATABASE_ERROR",
            errorCode: error.code,
        });
        return createPasswordResetRequestErrorResponse(
            "DATABASE_ERROR",
            "A database error occurred. Please try again later.",
            500
        );
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
        console.error("Database connection error:", error.message);
        logPasswordResetRequestEvent("failed", email, clientIp, null, {
            reason: "DATABASE_CONNECTION_ERROR",
        });
        return createPasswordResetRequestErrorResponse(
            "DATABASE_ERROR",
            "Unable to connect to the database. Please try again later.",
            503
        );
    }

    console.error("Unexpected password reset request error:", error);
    logPasswordResetRequestEvent("failed", email, clientIp, null, {
        reason: "INTERNAL_ERROR",
        error: error instanceof Error ? error.message : "Unknown",
    });
    return createPasswordResetRequestErrorResponse(
        "INTERNAL_ERROR",
        "An unexpected error occurred. Please try again later.",
        500
    );
}

// ============================================================================
// UNSUPPORTED METHODS
// ============================================================================

export const GET = () => methodNotAllowed(["POST"]);
export const PUT = () => methodNotAllowed(["POST"]);
export const DELETE = () => methodNotAllowed(["POST"]);
export const PATCH = () => methodNotAllowed(["POST"]);