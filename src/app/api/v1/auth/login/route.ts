//src\lib\app\api\v1\auth\login\route.ts

// src/app/api/v1/auth/login/route.ts

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/prisma/generated/client";

// Config
import { AUTH_CONFIG } from "@/lib/config/auth.config";

// Types
import type { UserLoginResponse } from "@/types/auth";

// Utilities
import { userLoginSchema } from "@/lib/validation/schemas/auth";
import { normalizeEmail } from "@/lib/utils/email";
import { getClientIp, getUserAgent } from "@/lib/http/request";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { ensureMinResponseTime } from "@/lib/security/timing";
import { methodNotAllowed } from "@/app/response";
import { authRateLimiter } from "@/lib/utils/rate-limit";
import { setAuthCookies, COOKIE_CONFIG } from "@/services/auth/session.service";

// Services
import {
    findUserByEmail,
    checkUserLockStatus,
    checkEmailVerification,
    checkUserActiveStatus,
    handleUserFailedAttempt,
    updateUserLoginMetadata,
    logUserLoginAttempt,
} from "@/services/auth/user-login.service";

// Response Builders
import {
    createUserLoginErrorResponse,
    createUserLoginSuccessResponse,
    buildUserLoginData,
} from "./response-builder";

const config = AUTH_CONFIG.login;
const MIN_WAIT = config.minResponseTime;

// ============================================================================
// POST HANDLER
// ============================================================================

/**
 * POST /api/v1/auth/login
 *
 * Authenticates a user and creates a new session.
 */
export async function POST(
    request: NextRequest
): Promise<NextResponse<UserLoginResponse>> {
    const startTime = Date.now();
    const clientIp = getClientIp(request);
    const userAgent = getUserAgent(request);
    let email = "";

    // 0. IP-based rate limit (separate from per-account lockout)
    const rateLimitResult = authRateLimiter.tryConsume(clientIp);
    if (!rateLimitResult.success) {
        const retryAfter = Math.max(
            1,
            Math.ceil((rateLimitResult.reset * 1000 - Date.now()) / 1000)
        );
        await ensureMinResponseTime(startTime, MIN_WAIT);
        logUserLoginAttempt(email || "unknown", clientIp, false, "RATE_LIMITED");
        return createUserLoginErrorResponse(
            "RATE_LIMITED",
            "Too many login attempts. Please try again later.",
            429,
            { retryAfter }
        );
    }

    try {
        // 1. Parse and validate request body
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            await ensureMinResponseTime(startTime, MIN_WAIT);
            return createUserLoginErrorResponse(
                "VALIDATION_ERROR",
                "Invalid JSON in request body",
                400
            );
        }

        const validationResult = userLoginSchema.safeParse(body);
        if (!validationResult.success) {
            await ensureMinResponseTime(startTime, MIN_WAIT);
            logUserLoginAttempt("unknown", clientIp, false, "VALIDATION_ERROR");
            return createUserLoginErrorResponse(
                "INVALID_CREDENTIALS",
                "Invalid email or password",
                401
            );
        }

        email = normalizeEmail(validationResult.data.email);
        const { password } = validationResult.data;

        // 2. Find user
        const user = await findUserByEmail(email);

        // 3. Check if user exists (constant time)
        if (!user) {
            await verifyPassword(
                password,
                "$2b$12$dummy.hash.to.prevent.timing.attacks.here"
            );
            await ensureMinResponseTime(startTime, MIN_WAIT);
            logUserLoginAttempt(email, clientIp, false, "INVALID_CREDENTIALS");
            return createUserLoginErrorResponse(
                "INVALID_CREDENTIALS",
                "Invalid email or password",
                401
            );
        }

        // 4. Check if account is locked
        const lockCheck = checkUserLockStatus(user);
        if (!lockCheck.valid) {
            await ensureMinResponseTime(startTime, MIN_WAIT);
            logUserLoginAttempt(email, clientIp, false, lockCheck.code, user.id);
            return createUserLoginErrorResponse(
                lockCheck.code,
                lockCheck.message,
                lockCheck.status,
                { retryAfter: lockCheck.retryAfter }
            );
        }

        // 5. Verify password
        const isValidPassword = await verifyPassword(password, user.password);

        if (!isValidPassword) {
            const { shouldLock } = await handleUserFailedAttempt(user);

            if (shouldLock) {
                await ensureMinResponseTime(startTime, MIN_WAIT);
                logUserLoginAttempt(email, clientIp, false, "ACCOUNT_LOCKED", user.id);
                return createUserLoginErrorResponse(
                    "ACCOUNT_LOCKED",
                    "Account has been locked due to too many failed login attempts",
                    429,
                    { retryAfter: config.lockoutDurationMinutes * 60 }
                );
            }

            await ensureMinResponseTime(startTime, MIN_WAIT);
            logUserLoginAttempt(email, clientIp, false, "INVALID_CREDENTIALS", user.id);
            return createUserLoginErrorResponse(
                "INVALID_CREDENTIALS",
                "Invalid email or password",
                401
            );
        }

        // 6. Check email verification
        const verificationCheck = checkEmailVerification(user);
        if (!verificationCheck.valid) {
            logUserLoginAttempt(email, clientIp, false, verificationCheck.code, user.id);
            return createUserLoginErrorResponse(
                verificationCheck.code,
                verificationCheck.message,
                verificationCheck.status
            );
        }

        // 7. Check if account is active
        const activeCheck = checkUserActiveStatus(user);
        if (!activeCheck.valid) {
            logUserLoginAttempt(email, clientIp, false, activeCheck.code, user.id);
            return createUserLoginErrorResponse(
                activeCheck.code,
                activeCheck.message,
                activeCheck.status
            );
        }

        // 8. Create session
        let accessToken: string;
        let refreshToken: string;

        try {
            const sessionResult = await createSession({
                userId: user.id,
                email: user.email,
                role: "USER",
                ipAddress: clientIp !== "unknown" ? clientIp : undefined,
                userAgent,
            });
            accessToken = sessionResult.accessToken;
            refreshToken = sessionResult.refreshToken;
        } catch (error) {
            console.error("Session creation error:", error);
            logUserLoginAttempt(email, clientIp, false, "SESSION_ERROR", user.id);
            return createUserLoginErrorResponse(
                "SESSION_ERROR",
                "Failed to create session. Please try again.",
                500
            );
        }

        // 9. Update login metadata
        await updateUserLoginMetadata(user.id, clientIp);

        // 10. Set auth cookies
        await setAuthCookies(accessToken, refreshToken);

        // 11. Return success
        logUserLoginAttempt(email, clientIp, true, undefined, user.id);

        const expiresAt = new Date(
            Date.now() + COOKIE_CONFIG.accessToken.maxAge * 1000
        );

        return createUserLoginSuccessResponse(buildUserLoginData(user), expiresAt);

    } catch (error) {
        await ensureMinResponseTime(startTime, MIN_WAIT);
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
): NextResponse<UserLoginResponse> {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error("Database error during login:", error.code, error.message);
        logUserLoginAttempt(email, clientIp, false, "DATABASE_ERROR");
        return createUserLoginErrorResponse(
            "DATABASE_ERROR",
            "A database error occurred. Please try again later.",
            500
        );
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
        console.error("Database connection error:", error.message);
        logUserLoginAttempt(email, clientIp, false, "DATABASE_ERROR");
        return createUserLoginErrorResponse(
            "DATABASE_ERROR",
            "Unable to connect to the database. Please try again later.",
            503
        );
    }

    console.error("Unexpected login error:", error);
    logUserLoginAttempt(email, clientIp, false, "INTERNAL_ERROR");
    return createUserLoginErrorResponse(
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