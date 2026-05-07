// src/app/api/v1/auth/mall-owner/request-link/response-builder.ts

import { NextResponse } from "next/server";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import type {
    MagicLinkErrorCode,
    MagicLinkSuccessResponse,
    MagicLinkErrorResponse,
} from "@/types/auth";

const config = AUTH_CONFIG.mallOwner;
const messages = AUTH_CONFIG.messages.magicLink;

/**
 * Create a standardized magic link error response
 */
export function createMagicLinkErrorResponse(
    code: MagicLinkErrorCode,
    message: string,
    status: number,
    options?: { details?: unknown; retryAfter?: number }
): NextResponse<MagicLinkErrorResponse> {
    const response: MagicLinkErrorResponse = {
        success: false,
        error: {
            code,
            message,
            ...(process.env.NODE_ENV === "development" && options?.details
                ? { details: options.details }
                : {}),
            ...(options?.retryAfter && { retryAfter: options.retryAfter }),
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
export function createGenericMagicLinkSuccessResponse(): NextResponse<MagicLinkSuccessResponse> {
    return NextResponse.json(
        {
            success: true,
            message: messages.success,
            data: {
                emailSent: true, // Always true to prevent enumeration
                expiresIn: config.linkExpiresIn,
            },
        },
        { status: 200 }
    );
}

/**
 * Get standard error messages
 */
export function getMagicLinkMessage(
    key: keyof typeof messages
): string {
    return messages[key];
}