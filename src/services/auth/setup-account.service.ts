// src/lib/services/auth/setup-account.service.ts

import prisma from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { sendWelcomeEmail } from "@/lib/email/send";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import { maskEmail } from "@/lib/utils/email";
import { logger } from "@/lib/utils/logger";
import { TokenType } from "@/prisma/generated/client";
import type {
  SetupFoundAccount,
  SetupAccountRole,
  SetupErrorCode,
  InvitationValidation,
  InvitationData,
} from "@/types/auth";

const config = AUTH_CONFIG.setupAccount;

// ============================================================================
// INVITATION VALIDATION
// ============================================================================

/**
 * Find and validate invitation token
 */
export async function findAndValidateInvitation(
  token: string
): Promise<InvitationValidation> {
  const invitation = await prisma.verificationToken.findUnique({
    where: { token },
    select: {
      token: true,
      identifier: true,
      expires: true,
      type: true,
    },
  });

  if (!invitation) {
    return {
      valid: false,
      code: "INVALID_TOKEN",
      message: "This invitation link is invalid or has already been used.",
      status: 400,
    };
  }

  if (invitation.type !== TokenType.INVITATION) {
    return {
      valid: false,
      code: "WRONG_TOKEN_TYPE",
      message: "Invalid invitation link.",
      status: 400,
    };
  }

  if (invitation.expires < new Date()) {
    // Clean up expired token
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {});

    return {
      valid: false,
      code: "TOKEN_EXPIRED",
      message:
        "This invitation has expired. Please request a new invitation from your administrator.",
      status: 410,
    };
  }

  return {
    valid: true,
    invitation: {
      token: invitation.token,
      email: invitation.identifier,
      expires: invitation.expires,
      type: invitation.type,
    },
  };
}

// ============================================================================
// ACCOUNT LOOKUP
// ============================================================================

/**
 * Find account by email in the Seller table
 */
export async function findSetupAccountByEmail(
  email: string
): Promise<SetupFoundAccount | null> {
  // Check Seller table first
  const seller = await prisma.seller.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      isActive: true,
      businessName: true,
    },
  });

  if (seller) {
    return {
      id: seller.id,
      email: seller.email,
      password: seller.password,
      isActive: seller.isActive,
      displayName: seller.businessName || "Valued Seller",
      role: "SELLER",
    };
  }

  return null;
}

// ============================================================================
// ACCOUNT STATUS CHECKS
// ============================================================================

/**
 * Check if account is already set up
 */
export function checkAccountAlreadySetup(account: SetupFoundAccount):
  | {
      valid: true;
    }
  | {
      valid: false;
      code: SetupErrorCode;
      message: string;
      status: number;
    } {
  if (account.password) {
    return {
      valid: false,
      code: "ACCOUNT_ALREADY_SETUP",
      message:
        "This account has already been set up. Please use the login page.",
      status: 409,
    };
  }
  return { valid: true };
}

/**
 * Check if account is active
 */
export function checkSetupAccountActive(account: SetupFoundAccount):
  | {
      valid: true;
    }
  | {
      valid: false;
      code: SetupErrorCode;
      message: string;
      status: number;
    } {
  if (!account.isActive) {
    return {
      valid: false,
      code: "ACCOUNT_DISABLED",
      message: "This account has been disabled. Please contact support.",
      status: 403,
    };
  }
  return { valid: true };
}

// ============================================================================
// ACCOUNT SETUP
// ============================================================================

/**
 * Complete account setup with password
 */
export async function completeAccountSetup(
  account: SetupFoundAccount,
  password: string,
  invitationToken: string
): Promise<void> {
  const hashedPassword = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    if (account.role === "SELLER") {
      await tx.seller.update({
        where: { id: account.id },
        data: {
          password: hashedPassword,
          isVerified: true,
        },
      });
    }
    // MALL_OWNER doesn't use verification tokens this way

    await tx.verificationToken.delete({
      where: { token: invitationToken },
    });
  });
}

/**
 * Update last login metadata after setup
 */
export async function updateSetupLoginMetadata(
  accountId: string,
  role: SetupAccountRole,
  clientIp: string
): Promise<void> {
  const updateData = {
    lastLoginAt: new Date(),
    lastLoginIp: clientIp !== "unknown" ? clientIp : null,
  };

  if (role === "SELLER") {
    await prisma.seller.update({
      where: { id: accountId },
      data: updateData,
    });
  }
  // MALL_OWNER doesn't track lastLoginAt this way
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Send welcome email after setup (non-blocking)
 */
export function sendSetupWelcomeEmail(
  email: string,
  displayName: string,
  role: SetupAccountRole
): void {
  if (!config.sendWelcomeEmail) {
    return;
  }

  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/seller/dashboard`;

  sendWelcomeEmail(email, displayName, dashboardUrl).catch((error) => {
    logger.error("Failed to send welcome email", { recipient: maskEmail(email), error });
  });
}

// ============================================================================
// LOGGING
// ============================================================================

export type SetupEvent = "setup_started" | "setup_completed" | "setup_failed";

/**
 * Log setup event for monitoring
 */
export function logSetupEvent(
  event: SetupEvent,
  email: string | null,
  ip: string,
  role: SetupAccountRole | null,
  details?: Record<string, unknown>
): void {
  const logData = {
    event,
    email: email ? maskEmail(email) : null,
    role,
    ip,
    ...details,
    timestamp: new Date().toISOString(),
  };

  switch (event) {
    case "setup_completed":
      logger.info("Account setup completed", logData);
      break;
    case "setup_failed":
      logger.warn("Account setup failed", logData);
      break;
    default:
      logger.info("Account setup started", logData);
  }
}
