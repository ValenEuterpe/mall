// src/app/api/v1/auth/setup-account/route.ts

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/prisma/generated/client";

// Config
import { AUTH_CONFIG } from "@/lib/config/auth.config";

// Types
import type { SetupResponse, SetupAccountRole } from "@/types/auth";

// Utilities
import { sellerSetupSchema } from "@/lib/validation/schemas/auth";
import { getClientIp, getUserAgent } from "@/lib/http/request";
import { ensureMinResponseTime } from "@/lib/security/timing";
import { createSession } from "@/lib/auth/session";
import { methodNotAllowed } from "@/app/response";
import { setAuthCookies } from "@/services/auth/session.service";

// Services
import {
    findAndValidateInvitation,
    findSetupAccountByEmail,
    checkAccountAlreadySetup,
    checkSetupAccountActive,
    completeAccountSetup,
    updateSetupLoginMetadata,
    sendSetupWelcomeEmail,
    logSetupEvent,
} from "@/services";

// Response Builders
import {
    createSetupErrorResponse,
    createSetupSuccessResponse,
    createSetupTokenValidationResponse,
} from "./response-builder";

const config = AUTH_CONFIG.setupAccount;

// ============================================================================
// POST HANDLER
// ============================================================================

/**
 * POST /api/v1/auth/setup-account
 *
 * Completes the account setup for invited Sellers.
 */
export async function POST(
    request: NextRequest
): Promise<NextResponse<SetupResponse>> {
    const startTime = Date.now();
    const clientIp = getClientIp(request);
    const userAgent = getUserAgent(request);
    let email: string | null = null;
    let accountRole: SetupAccountRole | null = null;

    try {
        // 1. Parse and validate request body
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createSetupErrorResponse(
                "VALIDATION_ERROR",
                "Invalid JSON in request body",
                400
            );
        }

        const validationResult = sellerSetupSchema.safeParse(body);
        if (!validationResult.success) {
            await ensureMinResponseTime(startTime, config.minResponseTime);
            const formattedErrors = validationResult.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            }));
            const firstError = formattedErrors[0];

            return createSetupErrorResponse(
                "VALIDATION_ERROR",
                firstError?.message ?? "Please check your input and try again",
                400,
                { field: firstError?.field, details: formattedErrors }
            );
        }

        const { token, password } = validationResult.data;
        logSetupEvent("setup_started", null, clientIp, null);

        // 2. Validate invitation token
        const invitationResult = await findAndValidateInvitation(token);
        if (!invitationResult.valid) {
            await ensureMinResponseTime(startTime, config.minResponseTime);
            logSetupEvent("setup_failed", null, clientIp, null, {
                reason: invitationResult.code,
            });
            return createSetupErrorResponse(
                invitationResult.code,
                invitationResult.message,
                invitationResult.status
            );
        }

        email = invitationResult.invitation.email;

        // 3. Find the account
        const account = await findSetupAccountByEmail(email);
        if (!account) {
            await ensureMinResponseTime(startTime, config.minResponseTime);
            logSetupEvent("setup_failed", email, clientIp, null, {
                reason: "ACCOUNT_NOT_FOUND",
            });
            return createSetupErrorResponse(
                "ACCOUNT_NOT_FOUND",
                "No account found for this invitation. Please contact support.",
                404
            );
        }

        accountRole = account.role;

        // 4. Check if account is already set up
        const setupCheck = checkAccountAlreadySetup(account);
        if (!setupCheck.valid) {
            await ensureMinResponseTime(startTime, config.minResponseTime);
            logSetupEvent("setup_failed", email, clientIp, accountRole, {
                reason: setupCheck.code,
            });
            return createSetupErrorResponse(
                setupCheck.code,
                setupCheck.message,
                setupCheck.status
            );
        }

        // 5. Check if account is active
        const activeCheck = checkSetupAccountActive(account);
        if (!activeCheck.valid) {
            await ensureMinResponseTime(startTime, config.minResponseTime);
            logSetupEvent("setup_failed", email, clientIp, accountRole, {
                reason: activeCheck.code,
            });
            return createSetupErrorResponse(
                activeCheck.code,
                activeCheck.message,
                activeCheck.status
            );
        }

        // 6. Complete account setup
        await completeAccountSetup(account, password, token);

        // 7. Create session (if auto-login enabled)
        let isLoggedIn = false;
        if (config.autoLoginAfterSetup) {
            try {
                const sessionResult = await createSession({
                    userId: account.id,
                    email: account.email,
                    role: accountRole,
                    ipAddress: clientIp !== "unknown" ? clientIp : undefined,
                    userAgent,
                });

                await setAuthCookies(
                    sessionResult.accessToken,
                    sessionResult.refreshToken
                );
                isLoggedIn = true;

                await updateSetupLoginMetadata(account.id, accountRole, clientIp);
            } catch (sessionError) {
                console.error("Failed to create session after setup:", sessionError);
            }
        }

        // 8. Send welcome email (non-blocking)
        sendSetupWelcomeEmail(account.email, account.displayName, accountRole);

        // 9. Log success and return
        logSetupEvent("setup_completed", email, clientIp, accountRole, {
            accountId: account.id,
            isLoggedIn,
        });

        await ensureMinResponseTime(startTime, config.minResponseTime);
        return createSetupSuccessResponse(
            {
                id: account.id,
                email: account.email,
                displayName: account.displayName,
                role: accountRole,
            },
            isLoggedIn
        );

    } catch (error) {
        await ensureMinResponseTime(startTime, config.minResponseTime);
        return handleError(error, email, clientIp, accountRole);
    }
}

// ============================================================================
// GET HANDLER
// ============================================================================

/**
 * GET /api/v1/auth/setup-account?token=xxx
 *
 * Validates an invitation token without consuming it.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();

    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get("token");

        if (!token) {
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createSetupErrorResponse(
                "VALIDATION_ERROR",
                "Invitation token is required",
                400
            );
        }

        // Validate invitation token
        const invitationResult = await findAndValidateInvitation(token);
        if (!invitationResult.valid) {
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createSetupErrorResponse(
                invitationResult.code,
                invitationResult.message,
                invitationResult.status
            );
        }

        const email = invitationResult.invitation.email;

        // Find the account
        const account = await findSetupAccountByEmail(email);
        if (!account) {
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createSetupErrorResponse(
                "ACCOUNT_NOT_FOUND",
                "No account found for this invitation.",
                404
            );
        }

        // Check if already set up
        const setupCheck = checkAccountAlreadySetup(account);
        if (!setupCheck.valid) {
            await ensureMinResponseTime(startTime, config.minResponseTime);
            return createSetupErrorResponse(
                setupCheck.code,
                setupCheck.message,
                setupCheck.status
            );
        }

        await ensureMinResponseTime(startTime, config.minResponseTime);
        return createSetupTokenValidationResponse(
            account.email,
            account.displayName,
            account.role,
            invitationResult.invitation.expires
        );

    } catch (error) {
        console.error("Token validation error:", error);
        await ensureMinResponseTime(startTime, config.minResponseTime);
        return createSetupErrorResponse(
            "INTERNAL_ERROR",
            "Unable to validate invitation. Please try again.",
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
    accountRole: SetupAccountRole | null
): NextResponse<SetupResponse> {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error("Database error during account setup:", error.code, error.message);
        logSetupEvent("setup_failed", email, clientIp, accountRole, {
            reason: "DATABASE_ERROR",
            errorCode: error.code,
        });
        return createSetupErrorResponse(
            "DATABASE_ERROR",
            "A database error occurred. Please try again later.",
            500
        );
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
        console.error("Database connection error:", error.message);
        logSetupEvent("setup_failed", email, clientIp, accountRole, {
            reason: "DATABASE_CONNECTION_ERROR",
        });
        return createSetupErrorResponse(
            "DATABASE_ERROR",
            "Unable to connect to the database. Please try again later.",
            503
        );
    }

    console.error("Unexpected account setup error:", error);
    logSetupEvent("setup_failed", email, clientIp, accountRole, {
        reason: "INTERNAL_ERROR",
        error: error instanceof Error ? error.message : "Unknown",
    });
    return createSetupErrorResponse(
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