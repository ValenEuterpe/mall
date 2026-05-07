// src/app/api/v1/auth/mall-owner/verify-link/response-builder.ts

import { NextResponse } from "next/server";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import type {
    VerifyLoginErrorCode,
    VerifyLoginSuccessResponse,
    VerifyLoginErrorResponse,
    MallOwnerData,
} from "@/types/auth";

const verifyConfig = AUTH_CONFIG.mallOwner.verify;

/**
 * Create a standardized verify login error response
 */
export function createVerifyLoginErrorResponse(
    code: VerifyLoginErrorCode,
    message: string,
    status: number,
    options?: {
        details?: unknown;
        remainingAttempts?: number;
        retryAfter?: number;
    }
): NextResponse<VerifyLoginErrorResponse> {
    const response: VerifyLoginErrorResponse = {
        success: false,
        error: {
            code,
            message,
            ...(options?.remainingAttempts !== undefined && {
                remainingAttempts: options.remainingAttempts,
            }),
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
 * Create a standardized verify login success response
 */
export function createVerifyLoginSuccessResponse(
    user: MallOwnerData,
    expiresAt: Date
): NextResponse<VerifyLoginSuccessResponse> {
    return NextResponse.json(
        {
            success: true,
            message: "Login successful. Welcome back!",
            data: {
                user,
                expiresAt: expiresAt.toISOString(),
                redirectUrl: verifyConfig.redirectUrl,
            },
        },
        { status: 200 }
    );
}

/**
 * Build mall owner data for response
 */
export function buildMallOwnerData(mallOwner: {
    id: string;
    email: string;
    name: string;
}): MallOwnerData {
    return {
        id: mallOwner.id,
        email: mallOwner.email,
        name: mallOwner.name,
    };
}