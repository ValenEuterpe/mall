// src/app/api/v1/auth/verify-email/response-builder.ts

import { NextResponse } from "next/server";
import type {
  VerifyEmailErrorCode,
  VerifyEmailSuccessResponse,
  VerifyEmailErrorResponse,
  VerifyEmailSuccessData,
  ResendEmailSuccessResponse,
  ResendEmailSuccessData,
} from "@/types/auth";

/**
 * Create a standardized verify email error response
 */
export function createVerifyEmailErrorResponse(
  code: VerifyEmailErrorCode,
  message: string,
  status: number,
  options?: { details?: unknown; retryAfter?: number }
): NextResponse<VerifyEmailErrorResponse> {
  const response: VerifyEmailErrorResponse = {
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
 * Create a standardized verify email success response
 */
export function createVerifyEmailSuccessResponse(
  data: VerifyEmailSuccessData,
  message: string
): NextResponse<VerifyEmailSuccessResponse> {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status: 200 }
  );
}

/**
 * Create already verified response (idempotent success)
 */
export function createAlreadyVerifiedResponse(
  email: string,
  verifiedAt: Date
): NextResponse<VerifyEmailSuccessResponse> {
  return NextResponse.json(
    {
      success: true,
      message: "Email address is already verified",
      data: {
        email,
        verifiedAt: verifiedAt.toISOString(),
        isNewVerification: false,
      },
    },
    { status: 200 }
  );
}

/**
 * Create resend email success response
 */
export function createResendEmailSuccessResponse(
  data: ResendEmailSuccessData,
  message: string
): NextResponse<ResendEmailSuccessResponse> {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status: 200 }
  );
}

/**
 * Create generic resend success response (for non-existent emails - prevents enumeration)
 */
export function createGenericResendSuccessResponse(
  email: string
): NextResponse<ResendEmailSuccessResponse> {
  return NextResponse.json(
    {
      success: true,
      message:
        "If an account exists with this email, a verification link has been sent.",
      data: {
        email,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    },
    { status: 200 }
  );
}
