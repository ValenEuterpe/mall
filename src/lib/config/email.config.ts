// src/lib/config/email.config.ts

import { env } from "@/env";

/**
 * Email service configuration
 */
export const EMAIL_CONFIG = {
  /**
   * Email delivery mode
   *
   * IMPORTANT SECURITY RULE:
   * - "console" mode is dev-only and will be ignored in production.
   */
  deliveryMode:
    env.NODE_ENV !== "production" && env.EMAIL_DELIVERY_MODE === "console"
      ? "console"
      : "smtp",

  /**
   * SMTP Connection settings
   */
  smtp: {
    host: env.EMAIL_SERVER_HOST,
    port: parseInt(env.EMAIL_SERVER_PORT, 10),
    secure: parseInt(env.EMAIL_SERVER_PORT, 10) === 465,
    user: env.EMAIL_SERVER_USER,
    password: env.EMAIL_SERVER_PASSWORD,
    from: env.EMAIL_FROM,
  },

  /**
   * Connection pool settings
   */
  pool: {
    maxConnections: 5,
    maxMessages: 100,
  },

  /**
   * Retry settings
   */
  retry: {
    /** Maximum retry attempts for failed emails */
    maxRetries: 3,
    /** Base delay between retries in ms (exponential backoff) */
    baseDelay: 1000,
  },

  /**
   * Timeout settings
   */
  timeouts: {
    /** Connection timeout in ms */
    connection: 10000,
    /** Socket timeout in ms */
    socket: 30000,
  },

  /**
   * Default expiry times for links
   */
  linkExpiry: {
    verification: "24 hours",
    passwordReset: "1 hour",
    magicLink: "15 minutes",
    invitation: "7 days",
  },
} as const;

/**
 * Brand/Template configuration
 */
export const BRAND_CONFIG = {
  name: "Wholesale Market",
  primaryColor: "#ffd700",
  textColor: "#000000",
  backgroundColor: "#ffffff",
  supportEmail: env.EMAIL_FROM,
  logoUrl: `${env.NEXT_PUBLIC_APP_URL}/logo.png`,
  appUrl: env.NEXT_PUBLIC_APP_URL,
} as const;

export type EmailConfig = typeof EMAIL_CONFIG;
export type BrandConfig = typeof BRAND_CONFIG;
