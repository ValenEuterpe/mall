// src/app/api/v1/auth/password/forgot/response-builder.ts

import { NextResponse } from "next/server";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import type {
    PasswordResetRequestErrorCode,
    PasswordResetRequestSuccessResponse,
    PasswordResetRequestErrorResponse,
} from "@/types/auth";

const config = AUTH_CONFIG.passwordReset;

/**
 * Create a standardized password reset request error response
 */
export function createPasswordResetRequestErrorResponse(
    code: PasswordResetRequestErrorCode,
    message: string,
    status: number,
    options?: { details?: unknown; retryAfter?: number }
): NextResponse<PasswordResetRequestErrorResponse> {
    const response: PasswordResetRequestErrorResponse = {
        success: false,
        error: {
            code,
            message,
            ...(options?.retryAfter && { retryAfter: options.retryAfter }),
            ...(options?.details && process.env.NODE_ENV === "development"
                ? { details: options.details }
                : {}),
        },
    };

    const headers: Record<string, string> = {};
    if (options?.retryAfter) {
        headers["Retry-After"] = String(options.retryAfter);
    }

    return NextResponse.json(response, { status, headers });
}

/**
 * Create a generic success response (prevents email enumeration)
 */
export function createGenericPasswordResetRequestSuccessResponse(): NextResponse<PasswordResetRequestSuccessResponse> {
    return NextResponse.json(
        {
            success: true,
            message: config.successMessage,
            data: {
                emailSent: true,
                expiresIn: config.linkExpiresInDisplay,
            },
        },
        { status: 200 }
    );
}