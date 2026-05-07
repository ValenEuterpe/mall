// src/app/api/v1/auth/mall-owner/verify-login/route.ts

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/prisma/generated/client";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import type { VerifyLoginResponse } from "@/types/auth";
import { mallOwnerVerifySchema } from "@/lib/validation/schemas/auth";
import { getClientIp, getUserAgent } from "@/lib/http/request";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { ensureMinResponseTime } from "@/lib/security/timing";
import { isIpAllowed } from "@/lib/security/ip-whitelist";
import { passwordAttemptTracker } from "@/lib/utils/rate-limit";
import { methodNotAllowed } from "@/app/response";
import { setAuthCookies, COOKIE_CONFIG } from "@/services/auth/session.service";
import {
    findMallOwnerForVerification,
    updateMallOwnerLoginMetadata,
    verifyMallOwnerToken,
    consumeMallOwnerToken,
    logVerifyLoginEvent,
    checkMallOwnerLockStatus,
    handleMallOwnerFailedAttempt,
} from "@/services";
import {
    createVerifyLoginErrorResponse,
    createVerifyLoginSuccessResponse,
    buildMallOwnerData,
} from "./response-builder";

const config = AUTH_CONFIG.mallOwner.verify;

// ============================================================================
// POST HANDLER
// ============================================================================

/**
 * POST /api/v1/auth/mall-owner/verify-login
 *
 * Completes the Mall Owner magic link login by verifying their password.
 */
export async function POST(
    request: NextRequest
): Promise<NextResponse<VerifyLoginResponse>> {
    const startTime = Date.now();
    const clientIp = getClientIp(request);
    const userAgent = getUserAgent(request) ?? "unknown";
    let email: string | null = null;
    let token: string | null = null;

    try {
        // 1. Check IP whitelist
        if (!isIpAllowed(clientIp)) {
            logVerifyLoginEvent("verify_blocked", null, clientIp, userAgent, {
                reason: "IP_NOT_ALLOWED",
            });
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createVerifyLoginErrorResponse(
                "IP_NOT_ALLOWED",
                "Access denied from this location. Please contact support.",
                403
            );
        }

        // 2. Parse and validate request body
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createVerifyLoginErrorResponse(
                "VALIDATION_ERROR",
                "Invalid JSON in request body",
                400
            );
        }

        const validationResult = mallOwnerVerifySchema.safeParse(body);
        if (!validationResult.success) {
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createVerifyLoginErrorResponse(
                "VALIDATION_ERROR",
                "Please provide a valid token and password",
                400,
                {
                    details: validationResult.error.issues.map((issue) => ({
                        field: issue.path.join("."),
                        message: issue.message,
                    })),
                }
            );
        }

        token = validationResult.data.token;
        const { password } = validationResult.data;

        logVerifyLoginEvent("verify_started", null, clientIp, userAgent);

        // 3. Check password attempt rate limiting
        const attemptCheck = passwordAttemptTracker.track(token);
        if (!attemptCheck.allowed) {
            logVerifyLoginEvent("verify_blocked", null, clientIp, userAgent, {
                reason: "MAX_ATTEMPTS_EXCEEDED",
                token: token.substring(0, 8) + "...",
            });

            await consumeMallOwnerToken(token).catch(() => { });
            await ensureMinResponseTime(startTime, config.minResponseTime);

            return createVerifyLoginErrorResponse(
                "MAX_ATTEMPTS_EXCEEDED",
                "Too many incorrect password attempts. Please request a new login link.",
                429,
                { remainingAttempts: 0 }
            );
        }

        // 4. Verify magic link token
        const tokenResult = await verifyMallOwnerToken(token);
        if (!tokenResult.valid) {
            logVerifyLoginEvent("verify_failed", null, clientIp, userAgent, {
                reason: tokenResult.error,
            });
            passwordAttemptTracker.clear(token);
            await ensureMinResponseTime(startTime, config.minResponseTime);

            return createVerifyLoginErrorResponse(
                tokenResult.code,
                tokenResult.message,
                tokenResult.status
            );
        }

        email = tokenResult.email;

        // 5. Find mall owner
        const mallOwner = await findMallOwnerForVerification(email);
        if (!mallOwner) {
            logVerifyLoginEvent("verify_failed", email, clientIp, userAgent, {
                reason: "ACCOUNT_NOT_FOUND",
            });
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createVerifyLoginErrorResponse(
                "ACCOUNT_NOT_FOUND",
                "No account found. Please contact support.",
                404
            );
        }

        // 6. Check per-email lockout
        const lockStatus = checkMallOwnerLockStatus(mallOwner);
        if (lockStatus) {
            logVerifyLoginEvent("verify_blocked", email, clientIp, userAgent, {
                reason: "ACCOUNT_LOCKED",
            });
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createVerifyLoginErrorResponse(
                "ACCOUNT_LOCKED",
                "Account has been locked due to too many failed login attempts. Please try again later.",
                429,
                { retryAfter: lockStatus.retryAfterSeconds }
            );
        }

        // 7. Verify password
        const isValidPassword = await verifyPassword(password, mallOwner.password);
        if (!isValidPassword) {
            const { shouldLock } = await handleMallOwnerFailedAttempt(mallOwner);
            if (shouldLock) {
                logVerifyLoginEvent("verify_failed", email, clientIp, userAgent, {
                    reason: "ACCOUNT_LOCKED",
                });
                await consumeMallOwnerToken(token).catch(() => { });
                passwordAttemptTracker.clear(token);
                await ensureMinResponseTime(startTime, config.minResponseTime);
                return createVerifyLoginErrorResponse(
                    "ACCOUNT_LOCKED",
                    "Account has been locked due to too many failed login attempts. Please try again later.",
                    429,
                    { retryAfter: AUTH_CONFIG.login.lockoutDurationMinutes * 60 }
                );
            }

            return handleInvalidPassword(
                token,
                email,
                clientIp,
                userAgent,
                attemptCheck.remainingAttempts,
                startTime
            );
        }

        // 7. Consume token and clear attempts
        await consumeMallOwnerToken(token);
        passwordAttemptTracker.clear(token);

        // 8. Create session
        let accessToken: string;
        let refreshToken: string;

        try {
            const sessionResult = await createSession({
                userId: mallOwner.id,
                email: mallOwner.email,
                role: "MALL_OWNER",
                ipAddress: clientIp !== "unknown" ? clientIp : undefined,
                userAgent,
            });
            accessToken = sessionResult.accessToken;
            refreshToken = sessionResult.refreshToken;
        } catch (error) {
            console.error("Session creation error:", error);
            logVerifyLoginEvent("verify_failed", email, clientIp, userAgent, {
                reason: "SESSION_ERROR",
            });
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createVerifyLoginErrorResponse(
                "SESSION_ERROR",
                "Failed to create session. Please try again.",
                500
            );
        }

        // 9. Update login metadata
        await updateMallOwnerLoginMetadata(mallOwner.id, clientIp);

        // 10. Set auth cookies
        await setAuthCookies(accessToken, refreshToken);

        // 11. Return success
        logVerifyLoginEvent("verify_success", email, clientIp, userAgent, {
            mallOwnerId: mallOwner.id,
        });

        await ensureMinResponseTime(startTime, config.minResponseTime);

        const expiresAt = new Date(
            Date.now() + COOKIE_CONFIG.accessToken.maxAge * 1000
        );

        return createVerifyLoginSuccessResponse(
            buildMallOwnerData(mallOwner),
            expiresAt
        );

    } catch (error) {
        await ensureMinResponseTime(startTime, config.minResponseTime);

        if (token) {
            passwordAttemptTracker.clear(token);
        }

        return handleError(error, email, clientIp, userAgent);
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function handleInvalidPassword(
    token: string,
    email: string,
    clientIp: string,
    userAgent: string,
    remainingAttempts: number,
    startTime: number
): Promise<NextResponse<VerifyLoginResponse>> {
    const isTokenExhausted = remainingAttempts <= 0;

    logVerifyLoginEvent("verify_failed", email, clientIp, userAgent, {
        reason: "INVALID_PASSWORD",
        remainingTokenAttempts: remainingAttempts,
        isTokenExhausted,
    });

    await ensureMinResponseTime(startTime, AUTH_CONFIG.mallOwner.verify.minResponseTime);

    if (isTokenExhausted) {
        await consumeMallOwnerToken(token).catch((err) => {
            console.error("Failed to invalidate exhausted token", err);
        });
        passwordAttemptTracker.clear(token);

        return createVerifyLoginErrorResponse(
            "MAX_ATTEMPTS_EXCEEDED",
            "Too many incorrect attempts. This link is now disabled. Please request a new one.",
            429,
            { remainingAttempts: 0 }
        );
    }

    return createVerifyLoginErrorResponse(
        "INVALID_PASSWORD",
        "Invalid password. Please check your credentials and try again.",
        401,
        { remainingAttempts }
    );
}

function handleError(
    error: unknown,
    email: string | null,
    clientIp: string,
    userAgent: string
): NextResponse<VerifyLoginResponse> {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error("Database error:", error.code, error.message);
        logVerifyLoginEvent("verify_failed", email, clientIp, userAgent, {
            reason: "DATABASE_ERROR",
            errorCode: error.code,
        });
        return createVerifyLoginErrorResponse(
            "DATABASE_ERROR",
            "A database error occurred. Please try again later.",
            500
        );
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
        console.error("Database connection error:", error.message);
        logVerifyLoginEvent("verify_failed", email, clientIp, userAgent, {
            reason: "DATABASE_CONNECTION_ERROR",
        });
        return createVerifyLoginErrorResponse(
            "DATABASE_ERROR",
            "Unable to connect to the database. Please try again later.",
            503
        );
    }

    console.error("Unexpected error:", error);
    logVerifyLoginEvent("verify_failed", email, clientIp, userAgent, {
        reason: "INTERNAL_ERROR",
        error: error instanceof Error ? error.message : "Unknown",
    });
    return createVerifyLoginErrorResponse(
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