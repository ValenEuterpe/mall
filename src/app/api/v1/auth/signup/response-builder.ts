// src/app/api/v1/auth/signup/response-builder.ts

import { NextResponse } from "next/server";
import type {
    SignupErrorCode,
    SignupSuccessResponse,
    SignupErrorResponse,
    SignupUserData,
} from "@/types/auth";

/**
 * Create a standardized signup error response
 */
export function createSignupErrorResponse(
    code: SignupErrorCode,
    message: string,
    status: number,
    details?: unknown
): NextResponse<SignupErrorResponse> {
    return NextResponse.json(
        {
            success: false,
            error: {
                code,
                message,
                ...(details && process.env.NODE_ENV === "development"
                    ? { details }
                    : {}),
            },
        },
        { status }
    );
}

/**
 * Create a standardized signup success response
 */
export function createSignupSuccessResponse(
    data: SignupUserData,
    emailVerificationSent: boolean
): NextResponse<SignupSuccessResponse> {
    const message = emailVerificationSent
        ? "Account created successfully. Please check your email to verify your account."
        : "Account created successfully. Verification email will be sent shortly.";

    return NextResponse.json(
        {
            success: true,
            message,
            data,
        },
        { status: 201 }
    );
}

/**
 * Create rate limit error response with headers
 */
export function createSignupRateLimitResponse(
    limit: number,
    remaining: number,
    reset: number
): NextResponse<SignupErrorResponse> {
    const retryAfter = Math.ceil((reset * 1000 - Date.now()) / 1000);

    return NextResponse.json(
        {
            success: false,
            error: {
                code: "RATE_LIMITED",
                message: "Too many signup attempts. Please try again later.",
            },
        },
        {
            status: 429,
            headers: {
                "X-RateLimit-Limit": String(limit),
                "X-RateLimit-Remaining": String(remaining),
                "X-RateLimit-Reset": String(reset),
                "Retry-After": String(retryAfter),
            },
        }
    );
}