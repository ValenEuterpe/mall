// src/app/api/v1/auth/verify-email/route.ts

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/prisma/generated/client";
import type { VerifyEmailResponse, ResendEmailResponse } from "@/types/auth";
import { normalizeEmail } from "@/lib/utils/email";
import { getClientIp } from "@/lib/http/request";
import { verifyEmailToken } from "@/lib/auth/email";
import { methodNotAllowed } from "@/app/response";
import {
  findUserForVerification,
  findUserForResend,
  markEmailAsVerified,
  mapTokenErrorToCode,
  sendWelcomeEmailAfterVerification,
  resendVerificationEmail,
  logVerificationAttempt,
} from "@/services";
import {
  createVerifyEmailErrorResponse,
  createVerifyEmailSuccessResponse,
  createAlreadyVerifiedResponse,
  createResendEmailSuccessResponse,
  createGenericResendSuccessResponse,
} from "./response-builder";

// ============================================================================
// POST HANDLER - Verify Email
// ============================================================================

/**
 * POST /api/v1/auth/verify-email
 *
 * Verifies a user's email address using a verification token.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<VerifyEmailResponse>> {
  const clientIp = getClientIp(request);
  let email: string | null = null;

  try {
    // 1. Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createVerifyEmailErrorResponse(
        "VALIDATION_ERROR",
        "Invalid JSON in request body",
        400
      );
    }

    if (!body || typeof body !== "object" || !("token" in body)) {
      logVerificationAttempt(null, clientIp, false, "VALIDATION_ERROR");
      return createVerifyEmailErrorResponse(
        "VALIDATION_ERROR",
        "Verification token is required",
        400
      );
    }

    const { token } = body as { token: unknown };

    if (typeof token !== "string" || token.trim().length === 0) {
      logVerificationAttempt(null, clientIp, false, "VALIDATION_ERROR");
      return createVerifyEmailErrorResponse(
        "VALIDATION_ERROR",
        "Invalid verification token format",
        400
      );
    }

    const trimmedToken = token.trim();

    // 2. Verify the token
    const verificationResult = await verifyEmailToken(trimmedToken);

    if (!verificationResult.valid) {
      const errorInfo = mapTokenErrorToCode(verificationResult.error);
      logVerificationAttempt(null, clientIp, false, errorInfo.code);
      return createVerifyEmailErrorResponse(
        errorInfo.code,
        errorInfo.message,
        errorInfo.status
      );
    }

    email = verificationResult.email;

    // 3. Find the user
    const user = await findUserForVerification(email);

    if (!user) {
      logVerificationAttempt(email, clientIp, false, "USER_NOT_FOUND");
      return createVerifyEmailErrorResponse(
        "USER_NOT_FOUND",
        "No account found with this email address",
        404
      );
    }

    // 4. Check if already verified
    if (user.emailVerified) {
      logVerificationAttempt(email, clientIp, false, "ALREADY_VERIFIED");
      return createAlreadyVerifiedResponse(user.email, user.emailVerified);
    }

    // 5. Mark email as verified
    const verifiedAt = await markEmailAsVerified(user.id);

    // 6. Send welcome email (non-blocking)
    sendWelcomeEmailAfterVerification(user.email, user.firstName);

    // 7. Return success
    logVerificationAttempt(email, clientIp, true);
    return createVerifyEmailSuccessResponse(
      {
        email: user.email,
        verifiedAt: verifiedAt.toISOString(),
        isNewVerification: true,
      },
      "Your email has been verified successfully. You can now log in to your account."
    );
  } catch (error) {
    return handleError(error, email, clientIp);
  }
}

// ============================================================================
// GET HANDLER - Verify via Query Parameter
// ============================================================================

/**
 * GET /api/v1/auth/verify-email?token=xxx
 *
 * Alternative verification method using query parameter.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<VerifyEmailResponse>> {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return createVerifyEmailErrorResponse(
      "VALIDATION_ERROR",
      "Verification token is required",
      400
    );
  }

  const mockRequest = new NextRequest(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({ token }),
  });

  return POST(mockRequest);
}

// ============================================================================
// PUT HANDLER - Resend Verification Email
// ============================================================================

/**
 * PUT /api/v1/auth/verify-email
 *
 * Resends the verification email to the user.
 */
export async function PUT(
  request: NextRequest
): Promise<NextResponse<ResendEmailResponse>> {
  try {
    // 1. Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createVerifyEmailErrorResponse(
        "VALIDATION_ERROR",
        "Invalid JSON in request body",
        400
      );
    }

    if (!body || typeof body !== "object" || !("email" in body)) {
      return createVerifyEmailErrorResponse(
        "VALIDATION_ERROR",
        "Email address is required",
        400
      );
    }

    const { email } = body as { email: unknown };

    if (typeof email !== "string" || !email.includes("@")) {
      return createVerifyEmailErrorResponse(
        "VALIDATION_ERROR",
        "Invalid email address format",
        400
      );
    }

    const normalizedEmail = normalizeEmail(email);

    // 2. Find the user
    const user = await findUserForResend(normalizedEmail);

    // Always return success to prevent email enumeration
    if (!user) {
      console.log(
        `Resend verification requested for non-existent email: ${normalizedEmail}`
      );
      return createGenericResendSuccessResponse(normalizedEmail);
    }

    // 3. Check if already verified
    if (user.emailVerified) {
      return createVerifyEmailErrorResponse(
        "ALREADY_VERIFIED",
        "This email address has already been verified. You can log in to your account.",
        409
      );
    }

    // 4. Create and send verification email
    const result = await resendVerificationEmail(normalizedEmail);

    if (!result.success) {
      return createVerifyEmailErrorResponse(
        result.error,
        result.message,
        result.error === "RATE_LIMITED" ? 429 : 500,
        { retryAfter: result.retryAfter }
      );
    }

    // 5. Return success
    return createResendEmailSuccessResponse(
      {
        email: normalizedEmail,
        expiresAt: result.expiresAt.toISOString(),
      },
      "Verification email has been sent. Please check your inbox."
    );
  } catch (error) {
    console.error("Resend verification email error:", error);
    return createVerifyEmailErrorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred. Please try again later.",
      500
    );
  }
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

function handleError(
  error: unknown,
  email: string | null,
  clientIp: string
): NextResponse<VerifyEmailResponse> {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error(
      "Database error during email verification:",
      error.code,
      error.message
    );
    logVerificationAttempt(email, clientIp, false, "DATABASE_ERROR");
    return createVerifyEmailErrorResponse(
      "DATABASE_ERROR",
      "A database error occurred. Please try again later.",
      500
    );
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error("Database connection error:", error.message);
    logVerificationAttempt(email, clientIp, false, "DATABASE_ERROR");
    return createVerifyEmailErrorResponse(
      "DATABASE_ERROR",
      "Unable to connect to the database. Please try again later.",
      503
    );
  }

  console.error("Unexpected email verification error:", error);
  logVerificationAttempt(email, clientIp, false, "INTERNAL_ERROR");
  return createVerifyEmailErrorResponse(
    "INTERNAL_ERROR",
    "An unexpected error occurred. Please try again later.",
    500
  );
}

// ============================================================================
// UNSUPPORTED METHODS
// ============================================================================

export const DELETE = () => methodNotAllowed(["GET", "POST", "PUT"]);
export const PATCH = () => methodNotAllowed(["GET", "POST", "PUT"]);
