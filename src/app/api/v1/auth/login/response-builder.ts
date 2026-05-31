// src/app/api/v1/auth/login/response-builder.ts

import { NextResponse } from "next/server";
import type {
  UserLoginErrorCode,
  UserLoginSuccessResponse,
  UserLoginErrorResponse,
  UserLoginData,
  UserAccountRecord,
} from "@/types/auth";

/**
 * Create a standardized user login error response
 */
export function createUserLoginErrorResponse(
  code: UserLoginErrorCode,
  message: string,
  status: number,
  options?: { details?: unknown; retryAfter?: number }
): NextResponse<UserLoginErrorResponse> {
  const response: UserLoginErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(options?.details && process.env.NODE_ENV === "development"
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
 * Create a standardized user login success response
 */
export function createUserLoginSuccessResponse(
  user: UserLoginData,
  expiresAt: Date
): NextResponse<UserLoginSuccessResponse> {
  return NextResponse.json(
    {
      success: true,
      message: "Login successful",
      data: {
        user,
        expiresAt: expiresAt.toISOString(),
      },
    },
    { status: 200 }
  );
}

/**
 * Build user data from account record
 */
export function buildUserLoginData(user: UserAccountRecord): UserLoginData {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}
