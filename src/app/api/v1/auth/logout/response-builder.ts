// src/app/api/v1/auth/logout/response-builder.ts

import { NextResponse } from "next/server";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import type {
    LogoutErrorCode,
    LogoutSuccessResponse,
    LogoutErrorResponse,
    LogoutSuccessData,
} from "@/types/auth";

const cookieConfig = AUTH_CONFIG.cookies;

/**
 * Create a standardized logout error response
 */
export function createLogoutErrorResponse(
    code: LogoutErrorCode,
    message: string,
    status: number,
    details?: unknown
): NextResponse<LogoutErrorResponse> {
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
 * Create a standardized success response with cleared cookies
 */
export function createLogoutSuccessResponse(
    data: LogoutSuccessData,
    message: string
): NextResponse<LogoutSuccessResponse> {
    const response = NextResponse.json(
        {
            success: true as const,
            message,
            data,
        },
        { status: 200 }
    );

    // Clear cookies in response headers as well (belt and suspenders)
    response.cookies.set(
        cookieConfig.names.accessToken,
        "",
        cookieConfig.clear
    );
    response.cookies.set(
        cookieConfig.names.refreshToken,
        "",
        cookieConfig.clear
    );

    return response;
}

/**
 * Build logout success message based on options
 */
export function buildLogoutMessage(allDevices: boolean): string {
    return allDevices
        ? "Successfully logged out from all devices"
        : "Successfully logged out";
}