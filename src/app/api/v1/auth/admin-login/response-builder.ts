// src/app/api/v1/auth/admin-login/login/response-builder.ts

import { NextResponse } from "next/server";
import type {
  AdminPortalRole,
  LoginErrorCode,
  LoginSuccessResponse,
  LoginNeedsSetupResponse,
  LoginErrorResponse,
  SellerUserData,
  UnifiedAccount,
} from "@/types/auth";

/**
 * Create a standardized login error response
 */
export function createLoginErrorResponse(
  code: LoginErrorCode,
  message: string,
  status: number,
  options?: { details?: unknown; retryAfter?: number }
): NextResponse<LoginErrorResponse> {
  const response: LoginErrorResponse = {
    success: false,
    needsSetup: false,
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
 * Create a needs setup response
 */
export function createNeedsSetupResponse(
  email: string,
  role: AdminPortalRole
): NextResponse<LoginNeedsSetupResponse> {
  return NextResponse.json(
    {
      success: false,
      needsSetup: true,
      error: {
        code: "ACCOUNT_NOT_SETUP",
        message:
          "Your account needs to be set up. Please complete the setup process.",
      },
      data: {
        email,
        role,
      },
    },
    { status: 403 }
  );
}

/**
 * Create a standardized success response
 */
export function createLoginSuccessResponse(
  user: SellerUserData,
  role: AdminPortalRole,
  expiresAt: Date
): NextResponse<LoginSuccessResponse> {
  return NextResponse.json(
    {
      success: true,
      message: "Login successful",
      data: {
        user,
        role,
        expiresAt: expiresAt.toISOString(),
      },
    },
    { status: 200 }
  );
}

/**
 * Build user data from account
 */
export function buildUserData(account: UnifiedAccount): SellerUserData {
  return {
    id: account.id,
    email: account.email,
    name: account.displayName,
    ...(account.role === "SELLER" && { businessName: account.displayName }),
  };
}
