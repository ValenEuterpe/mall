// src/lib/services/auth/signup.service.ts

import prisma from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import {
  createEmailVerificationToken,
  getVerificationUrl,
} from "@/lib/auth/email";
import { sendVerificationEmail, dispatch } from "@/lib/email/send";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import { maskEmail } from "@/lib/utils/email";
import { logger } from "@/lib/utils/logger";
import type { SignupData, CreatedUser, SignupErrorCode } from "@/types/auth";

const config = AUTH_CONFIG.signup;

// ============================================================================
// USER EXISTENCE CHECK
// ============================================================================

export interface ExistingUserInfo {
  id: string;
  emailVerified: boolean;
}

/**
 * Check if a user with the given email already exists
 */
export async function checkExistingUser(
  email: string
): Promise<ExistingUserInfo | null> {
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true },
  });

  return existingUser
    ? { id: existingUser.id, emailVerified: !!existingUser.emailVerified }
    : null;
}

// ============================================================================
// USER CREATION
// ============================================================================

/**
 * Create a new user in the database
 */
export async function createUser(data: SignupData): Promise<CreatedUser> {
  const hashedPassword = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      password: hashedPassword,
      emailVerified: null,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      createdAt: true,
    },
  });

  return user;
}

// ============================================================================
// EMAIL VERIFICATION
// ============================================================================

/**
 * Create verification token and send email
 * Returns true if email was sent successfully
 */
export async function sendUserVerificationEmail(
  email: string,
  locale?: string
): Promise<boolean> {
  if (!config.sendVerificationEmail) {
    return false;
  }

  try {
    const tokenResult = await createEmailVerificationToken(email);

    if (!tokenResult.success) {
      logger.error("Failed to create verification token", { recipient: maskEmail(email), error: tokenResult.error });
      return false;
    }

    const verifyUrl = getVerificationUrl(tokenResult.token, "email", locale);
    dispatch(() => sendVerificationEmail(email, verifyUrl));
    return true;
  } catch (error) {
    logger.error("Error sending verification email", { recipient: maskEmail(email), error });
    return false;
  }
}

// ============================================================================
// LOGGING
// ============================================================================

export type SignupEvent = "signup_attempt";

/**
 * Log signup attempt for monitoring
 */
export function logSignupAttempt(
  email: string,
  ip: string,
  success: boolean,
  errorCode?: SignupErrorCode
): void {
  const logData = {
    event: "signup_attempt",
    email: maskEmail(email),
    ip,
    success,
    errorCode,
    timestamp: new Date().toISOString(),
  };

  if (success) {
    logger.info("Signup successful", logData);
  } else {
    logger.warn("Signup failed", logData);
  }
}
