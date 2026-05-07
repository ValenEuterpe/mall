// src/app/api/v1/auth/admin-login/route.ts

import { Prisma } from "@/prisma/generated/client";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import type { LoginResponse, AdminPortalRole } from "@/types/auth";
import { sellerLoginSchema } from "@/lib/validation/schemas/auth";
import { normalizeEmail } from "@/lib/utils/email";
import { getClientIp, getUserAgent } from "@/lib/http/request";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { ensureMinResponseTime } from "@/lib/security/timing";
import { methodNotAllowed } from "@/app/response";
import { setAuthCookies, COOKIE_CONFIG } from "@/services/auth/session.service";

// Services
import {
    findAdminAccountByEmail,
    checkAccountStatus,
    handleFailedPasswordAttempt,
    updateLoginMetadata,
    logLoginAttempt,
} from "@/services";

// Response Builders
import {
    createLoginErrorResponse,
    createNeedsSetupResponse,
    createLoginSuccessResponse,
    buildUserData,
} from "./response-builder";

const config = AUTH_CONFIG.login;
const MIN_WAIT = config.minResponseTime;

// ============================================================================
// POST HANDLER
// ============================================================================

/**
 * POST /api/v1/auth/seller/login
 *
 * Authenticates a Seller and creates a new session.
 */
export async function POST(
    request: NextRequest
): Promise<NextResponse<LoginResponse>> {
    const startTime = Date.now();
    const clientIp = getClientIp(request);
    const userAgent = getUserAgent(request);
    let email = "";
    let role: AdminPortalRole | null = null;

    try {
        // 1. Parse and validate request body
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            await ensureMinResponseTime(startTime, MIN_WAIT);
            return createLoginErrorResponse(
                "VALIDATION_ERROR",
                "Invalid JSON in request body",
                400
            );
        }

        const validationResult = sellerLoginSchema.safeParse(body);
        if (!validationResult.success) {
            await ensureMinResponseTime(startTime, MIN_WAIT);
            logLoginAttempt("unknown", clientIp, null, false, "VALIDATION_ERROR");
            return createLoginErrorResponse(
                "INVALID_CREDENTIALS",
                "Invalid email or password",
                401
            );
        }

        email = normalizeEmail(validationResult.data.email);
        const { password } = validationResult.data;

        // 2. Find account
        const account = await findAdminAccountByEmail(email);

        // 3. Check if account exists (constant time)
        if (!account) {
            await verifyPassword(
                password,
                "$2b$12$dummy.hash.to.prevent.timing.attacks.here"
            );
            await ensureMinResponseTime(startTime, MIN_WAIT);
            logLoginAttempt(email, clientIp, null, false, "INVALID_CREDENTIALS");
            return createLoginErrorResponse(
                "INVALID_CREDENTIALS",
                "Invalid email or password",
                401
            );
        }

        role = account.role;

        // 4. Check if account needs setup
        if (!account.password) {
            logLoginAttempt(email, clientIp, role, false, "ACCOUNT_NOT_SETUP", account.id);
            return createNeedsSetupResponse(account.email, role);
        }

        // 5. Check account status
        const statusCheck = checkAccountStatus(account);
        if (!statusCheck.valid) {
            await ensureMinResponseTime(startTime, MIN_WAIT);
            logLoginAttempt(email, clientIp, role, false, statusCheck.code, account.id);
            return createLoginErrorResponse(
                statusCheck.code,
                statusCheck.message,
                statusCheck.status,
                { retryAfter: statusCheck.retryAfter }
            );
        }

        // 6. Verify password
        const isValidPassword = await verifyPassword(password, account.password);

        if (!isValidPassword) {
            const { shouldLock } = await handleFailedPasswordAttempt(account);

            if (shouldLock) {
                await ensureMinResponseTime(startTime, MIN_WAIT);
                logLoginAttempt(email, clientIp, role, false, "ACCOUNT_LOCKED", account.id);
                return createLoginErrorResponse(
                    "ACCOUNT_LOCKED",
                    "Account has been locked due to too many failed login attempts",
                    429,
                    { retryAfter: config.lockoutDurationMinutes * 60 }
                );
            }

            await ensureMinResponseTime(startTime, MIN_WAIT);
            logLoginAttempt(email, clientIp, role, false, "INVALID_CREDENTIALS", account.id);
            return createLoginErrorResponse(
                "INVALID_CREDENTIALS",
                "Invalid email or password",
                401
            );
        }

        // 7. Create session
        let accessToken: string;
        let refreshToken: string;

        try {
            const sessionResult = await createSession({
                userId: account.id,
                email: account.email,
                role,
                ipAddress: clientIp !== "unknown" ? clientIp : undefined,
                userAgent,
            });
            accessToken = sessionResult.accessToken;
            refreshToken = sessionResult.refreshToken;
        } catch (error) {
            console.error("Session creation error:", error);
            logLoginAttempt(email, clientIp, role, false, "SESSION_ERROR", account.id);
            return createLoginErrorResponse(
                "SESSION_ERROR",
                "Failed to create session. Please try again.",
                500
            );
        }

        // 8. Update login metadata
        await updateLoginMetadata(account, clientIp);

        // 9. Set auth cookies
        await setAuthCookies(accessToken, refreshToken);

        // 10. Return success
        logLoginAttempt(email, clientIp, role, true, undefined, account.id);

        const expiresAt = new Date(
            Date.now() + COOKIE_CONFIG.accessToken.maxAge * 1000
        );

        return createLoginSuccessResponse(buildUserData(account), role, expiresAt);

    } catch (error) {
        await ensureMinResponseTime(startTime, MIN_WAIT);
        return handleError(error, email, clientIp, role);
    }
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

function handleError(
    error: unknown,
    email: string,
    clientIp: string,
    role: AdminPortalRole | null
): NextResponse<LoginResponse> {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error("Database error during login:", error.code, error.message);
        logLoginAttempt(email, clientIp, role, false, "DATABASE_ERROR");
        return createLoginErrorResponse(
            "DATABASE_ERROR",
            "A database error occurred. Please try again later.",
            500
        );
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
        console.error("Database connection error:", error.message);
        logLoginAttempt(email, clientIp, role, false, "DATABASE_ERROR");
        return createLoginErrorResponse(
            "DATABASE_ERROR",
            "Unable to connect to the database. Please try again later.",
            503
        );
    }

    console.error("Unexpected login error:", error);
    logLoginAttempt(email, clientIp, role, false, "INTERNAL_ERROR");
    return createLoginErrorResponse(
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