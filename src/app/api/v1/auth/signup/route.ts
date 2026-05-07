// src/app/api/v1/auth/signup/route.ts

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/prisma/generated/client";
import type { SignupResponse } from "@/types/auth";
import { userSignupSchema } from "@/lib/validation/schemas/auth";
import { normalizeEmail } from "@/lib/utils/email";
import { getClientIp } from "@/lib/http/request";
import { methodNotAllowed } from "@/app/response";
import { signupRateLimiter } from "@/lib/utils/rate-limit";
import {
  checkExistingUser,
  createUser,
  sendUserVerificationEmail,
  logSignupAttempt,
} from "@/services";
import {
  createSignupErrorResponse,
  createSignupSuccessResponse,
  createSignupRateLimitResponse,
} from "./response-builder";

// ============================================================================
// POST HANDLER
// ============================================================================

/**
 * POST /api/v1/auth/signup
 *
 * Creates a new user account and sends verification email.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<SignupResponse>> {
  const clientIp = getClientIp(request);
  let email = "";

  // 1. Check rate limit - use tryConsume instead of check
  const rateLimitResult = signupRateLimiter.tryConsume(clientIp);
  if (!rateLimitResult.success) {
    logSignupAttempt(email || "unknown", clientIp, false, "RATE_LIMITED");
    return createSignupRateLimitResponse(
      rateLimitResult.limit,
      rateLimitResult.remaining,
      rateLimitResult.reset
    );
  }

  try {
    // 2. Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createSignupErrorResponse(
        "VALIDATION_ERROR",
        "Invalid JSON in request body",
        400
      );
    }

    const validationResult = userSignupSchema.safeParse(body);
    if (!validationResult.success) {
      const formattedErrors = validationResult.error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      logSignupAttempt("unknown", clientIp, false, "VALIDATION_ERROR");
      return createSignupErrorResponse(
        "VALIDATION_ERROR",
        "Please check your input and try again",
        400,
        formattedErrors
      );
    }

    const {
      email: rawEmail,
      firstName,
      lastName,
      password,
      locale,
    } = validationResult.data;

    email = normalizeEmail(rawEmail);

    // 3. Check for existing user
    const existingUser = await checkExistingUser(email);
    if (existingUser) {
      logSignupAttempt(email, clientIp, false, "EMAIL_EXISTS");
      return createSignupErrorResponse(
        "EMAIL_EXISTS",
        "An account with this email already exists. Please sign in or use a different email.",
        409
      );
    }

    // 4. Create user
    const user = await createUser({
      email,
      firstName,
      lastName,
      password,
    });

    // 5. Send verification email
    const emailVerificationSent = await sendUserVerificationEmail(
      email,
      locale
    );

    // 6. Return success
    logSignupAttempt(email, clientIp, true);
    return createSignupSuccessResponse(
      {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerificationSent,
      },
      emailVerificationSent
    );
  } catch (error) {
    return handleError(error, email, clientIp);
  }
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

function handleError(
  error: unknown,
  email: string,
  clientIp: string
): NextResponse<SignupResponse> {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation (race condition)
    if (error.code === "P2002") {
      logSignupAttempt(email, clientIp, false, "EMAIL_EXISTS");
      return createSignupErrorResponse(
        "EMAIL_EXISTS",
        "An account with this email already exists",
        409
      );
    }

    console.error("Database error during signup:", error.code, error.message);
    logSignupAttempt(email, clientIp, false, "DATABASE_ERROR");
    return createSignupErrorResponse(
      "DATABASE_ERROR",
      "A database error occurred. Please try again later.",
      500
    );
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error("Database connection error:", error.message);
    logSignupAttempt(email, clientIp, false, "DATABASE_ERROR");
    return createSignupErrorResponse(
      "DATABASE_ERROR",
      "Unable to connect to the database. Please try again later.",
      503
    );
  }

  console.error("Unexpected signup error:", error);
  logSignupAttempt(email, clientIp, false, "INTERNAL_ERROR");
  return createSignupErrorResponse(
    "INTERNAL_ERROR",
    "An unexpected error occurred. Please try again later.",
    500
  );
}

// ============================================================================
// UNSUPPORTED METHODS
// ============================================================================

export const GET = () => methodNotAllowed(["POST"]);
export const PUT = () => methodNotAllowed(["POST"]);
export const DELETE = () => methodNotAllowed(["POST"]);
export const PATCH = () => methodNotAllowed(["POST"]);
