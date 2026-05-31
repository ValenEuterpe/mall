// src/app/api/v1/auth/password/reset/response-builder.ts

import { NextResponse } from "next/server";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import type {
  PasswordResetErrorCode,
  PasswordResetSuccessResponse,
  PasswordResetErrorResponse,
  TokenValidationSuccessResponse,
  UserRole,
} from "@/types/auth";

const redirectUrls = AUTH_CONFIG.redirectUrls.login;
const config = AUTH_CONFIG.passwordReset;

/**
 * Create a standardized password reset error response
 */
export function createPasswordResetErrorResponse(
  code: PasswordResetErrorCode,
  message: string,
  status: number,
  options?: { details?: unknown; field?: string }
): NextResponse<PasswordResetErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(options?.field && { field: options.field }),
        ...(options?.details && process.env.NODE_ENV === "development"
          ? { details: options.details }
          : {}),
      },
    },
    { status }
  );
}

/**
 * Create a standardized password reset success response
 */
export function createPasswordResetSuccessResponse(
  email: string,
  role: UserRole,
  sessionsInvalidated: boolean
): NextResponse<PasswordResetSuccessResponse> {
  return NextResponse.json(
    {
      success: true,
      message:
        "Your password has been reset successfully. You can now log in with your new password.",
      data: {
        email,
        role,
        sessionsInvalidated,
        redirectUrl: redirectUrls[role],
      },
    },
    { status: 200 }
  );
}

/**
 * Create a token validation success response
 */
export function createTokenValidationSuccessResponse(
  email: string
): NextResponse<TokenValidationSuccessResponse> {
  return NextResponse.json({
    success: true,
    data: {
      email,
      expiresAt: new Date(
        Date.now() + config.tokenExpiryMinutes * 60 * 1000
      ).toISOString(),
    },
  });
}
