import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const DEFAULT_APP_URL = "http://localhost:3000";

export const env = createEnv({
  /**
   * Server-side environment variables schema
   */
  server: {
    // Database
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url().optional(), // Optional direct database URL for admin tools (e.g. pgAdmin); should point to the same database as DATABASE_URL



    // NextAuth
    NEXTAUTH_SECRET: z.string().min(32),
    NEXTAUTH_URL: z.string().url(),

    // JWT
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRY: z.string().default("15m"),
    JWT_REFRESH_EXPIRY: z.string().default("7d"),

    // Email
    EMAIL_FROM: z.string().email(),
    EMAIL_SERVER_HOST: z.string(),
    EMAIL_SERVER_PORT: z.string(),
    EMAIL_SERVER_USER: z.string(),
    EMAIL_SERVER_PASSWORD: z.string(),

    /**
     * Dev-only email delivery mode.
     * - "smtp": send real emails via SMTP
     * - "console": do not send; log email payload to server console (only allowed when NODE_ENV !== "production")
     */
    EMAIL_DELIVERY_MODE: z.enum(["smtp", "console"]).optional().default("smtp"),

    // Upload
    MAX_FILE_SIZE: z.string().default("5242880"), // 5MB
    ALLOWED_FILE_TYPES: z.string().default("image/jpeg,image/png,image/svg+xml"),

    // Security
    ADMIN_TOKEN: z.string().min(64),
    ALLOWED_IPS: z.string().optional(),
    RATE_LIMIT_MAX: z.string().default("100"),
    RATE_LIMIT_WINDOW: z.string().default("900000"), // 15min

    // Database pool
    DB_POOL_MAX: z.coerce.number().int().positive().default(10),
    DB_POOL_IDLE_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(30_000),
    DB_POOL_CONNECTION_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(10_000),
    DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(15_000),

    // Environment
    NODE_ENV: z.enum(["development", "production", "test"]),

    // Backwards-compatible app url (used as fallback for NEXT_PUBLIC_APP_URL)
    APP_URL: z.string().url().default(DEFAULT_APP_URL),

    // AI Translation (Gemini)
    GEMINI_API_KEY: z.string().min(1).optional(),

    // Sentry (build-time only; used to upload source maps)
    SENTRY_AUTH_TOKEN: z.string().optional(),
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),
  },

  /**
   * Client-side environment variables schema
   */
  client: {
    /**
     * Required by the UI, email templates, and link generation.
     *
     * We default it to APP_URL / localhost to ensure `next build` is buildable
     * in CI environments that do not inject NEXT_PUBLIC_* vars during compilation.
     */
    NEXT_PUBLIC_APP_URL: z.string().url().default(DEFAULT_APP_URL),

    /**
     * Sentry DSN. When unset, the SDK is a no-op — no errors leave the app.
     * Same value is used for client + server + edge runtimes.
     */
    NEXT_PUBLIC_SENTRY_DSN: z
      .string()
      .optional()
      .transform((v) => (v === "" ? undefined : v))
      .pipe(z.string().url().optional()),
  },

  /**
   * Environment variables available on both client and server
   */
  runtimeEnv: {
    // Server
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY,
    JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST,
    EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT,
    EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER,
    EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD,
    EMAIL_DELIVERY_MODE: process.env.EMAIL_DELIVERY_MODE,
    MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
    ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES,
    ADMIN_TOKEN: process.env.ADMIN_TOKEN,
    ALLOWED_IPS: process.env.ALLOWED_IPS,
    RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW,
    DB_POOL_MAX: process.env.DB_POOL_MAX,
    DB_POOL_IDLE_TIMEOUT_MS: process.env.DB_POOL_IDLE_TIMEOUT_MS,
    DB_POOL_CONNECTION_TIMEOUT_MS: process.env.DB_POOL_CONNECTION_TIMEOUT_MS,
    DB_STATEMENT_TIMEOUT_MS: process.env.DB_STATEMENT_TIMEOUT_MS,
    NODE_ENV: process.env.NODE_ENV,
    APP_URL: process.env.APP_URL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,

    // Client
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },

  /**
   * Skip validation during build (for CI/CD) if explicitly requested.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
