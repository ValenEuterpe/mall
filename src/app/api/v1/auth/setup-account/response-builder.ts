// src/app/api/v1/auth/setup-account/response-builder.ts

import { NextResponse } from "next/server";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import type {
    SetupErrorCode,
    SetupSuccessResponse,
    SetupErrorResponse,
    SetupAccountData,
    SetupTokenValidationResponse,
    SetupAccountRole,
} from "@/types/auth";

const redirectUrls = AUTH_CONFIG.redirectUrls.dashboard;

/**
 * Create a standardized setup error response
 */
export function createSetupErrorResponse(
    code: SetupErrorCode,
    message: string,
    status: number,
    options?: { details?: unknown; field?: string }
): NextResponse<SetupErrorResponse> {
    return NextResponse.json(
        {
            success: false,
            error: {
                code,
                message,
                ...(options?.field && { field: options.field }),
                ...(process.env.NODE_ENV === "development" && options?.details
                    ? { details: options.details }
                    : {}),
            },
        },
        { status }
    );
}

/**
 * Create a standardized setup success response
 */
export function createSetupSuccessResponse(
    account: SetupAccountData,
    isLoggedIn: boolean
): NextResponse<SetupSuccessResponse> {
    const redirectUrl = redirectUrls[account.role];

    return NextResponse.json(
        {
            success: true,
            message: "Your account has been set up successfully. Welcome aboard!",
            data: {
                user: account,
                isLoggedIn,
                redirectUrl,
            },
        },
        { status: 200 }
    );
}

/**
 * Create token validation success response (for GET)
 */
export function createSetupTokenValidationResponse(
    email: string,
    displayName: string,
    role: SetupAccountRole,
    expiresAt: Date
): NextResponse<SetupTokenValidationResponse> {
    return NextResponse.json({
        success: true,
        data: {
            email,
            displayName,
            role,
            expiresAt: expiresAt.toISOString(),
        },
    });
}