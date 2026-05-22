// src/lib/email/transporter.ts

import nodemailer from "nodemailer";
import { EMAIL_CONFIG } from "@/lib/config/email.config";
import { logger } from "@/lib/utils/logger";
import type { EmailConnectionResult } from "@/types/email";

// ============================================================================
// TRANSPORTER STATE
// ============================================================================

const globalForTransporter = globalThis as unknown as {
  emailTransporter: nodemailer.Transporter | null;
};

function getCachedTransporter(): nodemailer.Transporter | null {
  return globalForTransporter.emailTransporter ?? null;
}

function setCachedTransporter(t: nodemailer.Transporter | null): void {
  globalForTransporter.emailTransporter = t;
}

let isVerified = false;
let lastVerifiedAt: Date | null = null;

// ============================================================================
// TRANSPORTER MANAGEMENT
// ============================================================================

/**
 * Create or get the email transporter
 */
export function getTransporter(): nodemailer.Transporter {
  let transporter = getCachedTransporter();
  if (!transporter) {
    console.log("[EMAIL-DEBUG] Creating SMTP transporter", {
      host: EMAIL_CONFIG.smtp.host,
      port: EMAIL_CONFIG.smtp.port,
      secure: EMAIL_CONFIG.smtp.secure,
      user: EMAIL_CONFIG.smtp.user,
      deliveryMode: EMAIL_CONFIG.deliveryMode,
    });
    transporter = nodemailer.createTransport({
      host: EMAIL_CONFIG.smtp.host,
      port: EMAIL_CONFIG.smtp.port,
      secure: EMAIL_CONFIG.smtp.secure,
      auth: {
        user: EMAIL_CONFIG.smtp.user,
        pass: EMAIL_CONFIG.smtp.password,
      },
      connectionTimeout: EMAIL_CONFIG.timeouts.connection,
      socketTimeout: EMAIL_CONFIG.timeouts.socket,
    });
    setCachedTransporter(transporter);
  }

  return transporter;
}

/**
 * Verify the email transporter connection
 */
export async function verifyEmailConnection(): Promise<EmailConnectionResult> {
  try {
    const transport = getTransporter();
    await transport.verify();
    isVerified = true;
    lastVerifiedAt = new Date();
    logger.info("Email service connected");
    return { connected: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Email service connection failed", { error: message });
    isVerified = false;
    return { connected: false, error: message };
  }
}

/**
 * Close the email transporter connection
 */
export async function closeEmailConnection(): Promise<void> {
  const transporter = getCachedTransporter();
  if (transporter) {
    transporter.close();
    setCachedTransporter(null);
    isVerified = false;
    lastVerifiedAt = null;
    logger.info("Email service connection closed");
  }
}

/**
 * Get transporter status
 */
export function getTransporterStatus(): {
  created: boolean;
  verified: boolean;
  lastVerifiedAt: Date | null;
} {
  const transporter = getCachedTransporter();
  return {
    created: transporter !== null,
    verified: isVerified,
    lastVerifiedAt,
  };
}

/**
 * Get the from address
 */
export function getFromAddress(): string {
  return EMAIL_CONFIG.smtp.from;
}
