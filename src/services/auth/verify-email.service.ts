// src/lib/services/auth/verify-email.service.ts

import prisma from "@/lib/db/prisma";
import {
  createEmailVerificationToken,
  getVerificationUrl,
} from "@/lib/auth/email";
import { sendVerificationEmail, sendWelcomeEmail } from "@/lib/email/send";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import { maskEmail } from "@/lib/utils/email";
import { logger } from "@/lib/utils/logger";
import type { VerifyEmailErrorCode, VerifyEmailUserInfo } from "@/types/auth";

const config = AUTH_CONFIG.verifyEmail;

// ============================================================================
// USER LOOKUP
// ============================================================================

/**
 * Find user by email for verification
 */
export async function findUserForVerification(
  email: string
): Promise<VerifyEmailUserInfo | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      emailVerified: true,
      isActive: true,
    },
  });

  return user;
}

/**
 * Find user for resend verification
 */
export async function findUserForResend(email: string): Promise<{
  id: string;
  email: string;
  firstName: string;
  emailVerified: Date | null;
} | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      firstName: true,
      emailVerified: true,
    },
  });

  return user;
}

// ============================================================================
// EMAIL VERIFICATION UPDATE
// ============================================================================

/**
 * Mark user's email as verified
 */
export async function markEmailAsVerified(userId: string): Promise<Date> {
  const verifiedAt = new Date();

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerified: verifiedAt,
      isActive: true,
    },
  });

  return verifiedAt;
}

// ============================================================================
// TOKEN ERROR MAPPING
// ============================================================================

/**
 * Map token verification error to API error code
 */
export function mapTokenErrorToCode(tokenError: string): {
  code: VerifyEmailErrorCode;
  status: number;
  message: string;
} {
  const errorMap: Record<
    string,
    { code: VerifyEmailErrorCode; status: number; message: string }
  > = {
    EXPIRED: {
      code: "TOKEN_EXPIRED",
      status: 410,
      message: "This verification link has expired. Please request a new one.",
    },
    INVALID_TOKEN: {
      code: "INVALID_TOKEN",
      status: 400,
      message: "This verification link is invalid or has already been used.",
    },
    ALREADY_USED: {
      code: "TOKEN_ALREADY_USED",
      status: 409,
      message: "This email has already been verified.",
    },
    WRONG_TYPE: {
      code: "INVALID_TOKEN",
      status: 400,
      message: "This verification link is invalid.",
    },
  };

  return (
    errorMap[tokenError] ?? {
      code: "INTERNAL_ERROR",
      status: 500,
      message: "Unable to verify email at this time. Please try again later.",
    }
  );
}

// ============================================================================
// WELCOME EMAIL
// ============================================================================

/**
 * Send welcome email after verification (non-blocking)
 */
export function sendWelcomeEmailAfterVerification(
  email: string,
  firstName: string
): void {
  if (!config.sendWelcomeEmail) {
    return;
  }

  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}${config.dashboardUrl}`;
  const userName = firstName || "there";

  sendWelcomeEmail(email, userName, dashboardUrl).catch((error) => {
    logger.error("Failed to send welcome email", {
      recipient: maskEmail(email),
      error,
    });
  });
}

// ============================================================================
// RESEND VERIFICATION
// ============================================================================

export type ResendVerificationResult =
  | {
      success: true;
      expiresAt: Date;
    }
  | {
      success: false;
      error: VerifyEmailErrorCode;
      message: string;
      retryAfter?: number;
    };

/**
 * Create and send a new verification email
 */
export async function resendVerificationEmail(
  email: string
): Promise<ResendVerificationResult> {
  const tokenResult = await createEmailVerificationToken(email);

  if (!tokenResult.success) {
    if (tokenResult.error === "RATE_LIMITED") {
      return {
        success: false,
        error: "RATE_LIMITED",
        message: "Please wait before requesting another verification email.",
        retryAfter: tokenResult.retryAfter,
      };
    }

    logger.error("Failed to create verification token", {
      recipient: maskEmail(email),
      error: tokenResult.error,
    });
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Unable to generate verification link. Please try again later.",
    };
  }

  const verifyUrl = getVerificationUrl(tokenResult.token, "email");
  const emailResult = await sendVerificationEmail(email, verifyUrl);

  if (!emailResult.success) {
    logger.error("Failed to send verification email", {
      recipient: maskEmail(email),
      error: emailResult.error,
    });
    return {
      success: false,
      error: "EMAIL_SEND_FAILED",
      message: "Unable to send verification email. Please try again later.",
    };
  }

  logger.info("Verification email resent", { email: maskEmail(email) });

  return {
    success: true,
    expiresAt: tokenResult.expiresAt,
  };
}

// ============================================================================
// LOGGING
// ============================================================================

export type VerifyEmailEvent = "success" | "failed";

/**
 * Log verification attempt for monitoring
 */
export function logVerificationAttempt(
  email: string | null,
  ip: string,
  success: boolean,
  errorCode?: VerifyEmailErrorCode
): void {
  const logData = {
    event: success ? "email_verification_success" : "email_verification_failed",
    email: email ? maskEmail(email) : "unknown",
    ip,
    errorCode,
    timestamp: new Date().toISOString(),
  };

  if (success) {
    logger.info("Email verification successful", logData);
  } else {
    logger.warn("Email verification failed", logData);
  }
}
