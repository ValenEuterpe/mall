// src/app/api/v1/auth/refresh/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
    refreshSession,
    getAccessTokenCookieOptions,
    getRefreshTokenCookieOptions,
} from "@/services/auth/refresh-session.service";

export async function POST() {
    try {
        const cookieStore = await cookies();
        const refreshToken = cookieStore.get("refresh_token")?.value;

        if (!refreshToken) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: "NO_REFRESH_TOKEN",
                        message: "No refresh token provided",
                        requiresLogin: true,
                    },
                },
                { status: 401 }
            );
        }

        // Use the shared refresh session service
        const result = await refreshSession(refreshToken);

        if (!result.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: result.code,
                        message: result.message,
                        requiresLogin: result.requiresLogin,
                    },
                },
                { status: 401 }
            );
        }

        // Set new access token cookie
        const accessTokenOptions = getAccessTokenCookieOptions();
        cookieStore.set("access_token", result.accessToken, accessTokenOptions);

        // Set new refresh token if rotation occurred
        if (result.refreshToken) {
            const refreshTokenOptions = getRefreshTokenCookieOptions();
            cookieStore.set("refresh_token", result.refreshToken, refreshTokenOptions);
        }

        return NextResponse.json({
            success: true,
            message: "Token refreshed successfully",
            data: {
                expiresAt: result.expiresAt.toISOString(),
                tokenRotated: Boolean(result.refreshToken),
            },
        });
    } catch (error) {
        console.error("Token refresh error:", error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: "INTERNAL_ERROR",
                    message: "Failed to refresh token",
                    requiresLogin: true,
                },
            },
            { status: 500 }
        );
    }
}