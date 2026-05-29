// src/lib/config/auth.config.ts

import { UserRole } from "@/types/auth";

/**
 * Authentication and security configuration
 * Centralized configuration for all auth-related features
 */

export const AUTH_CONFIG = {
  emailCheck: {
    /**
     Whether to reveal detailed account information
     Set to false in high-security environments to prevent email enumeration
     */
    revealAccountDetails: true,

    /**
     Whether to reveal account type (USER, SELLER, etc.)
     Consider setting to false for public-facing APIs
     */
    revealAccountType: true,
    revealAccountStatus: true,
    minResponseTime: 100,
  },

  session: {
    expiryDuration: 60 * 60 * 24 * 30, // 30 days (increased from 7 days)
    extendOnActivity: true,
  },

  login: {
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 15,
    trackFailedAttempts: true,
    minResponseTime: 1000,
  },

  cookies: {
    //Cookie names for authentication tokens
    names: {
      accessToken: "access_token",
      refreshToken: "refresh_token",
    },

    //Base cookie options
    base: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    },

    //Options for clearing cookies
    clear: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 0,
    },
  },

  mallOwner: {
    /**
     * Whether IP whitelisting is enabled
     */
    ipWhitelistEnabled: Boolean(process.env.ALLOWED_IPS),
    allowedIps:
      process.env.ALLOWED_IPS?.split(",")
        .map((ip) => ip.trim())
        .filter(Boolean) ?? [],

    logFailedAttempts: true,
    minResponseTime: 150,
    linkExpiresIn: "15 minutes",
    maxMfaAttempts: 5,
    mfaLockoutMinutes: 30,
    verify: {
      maxPasswordAttempts: 3,
      minResponseTime: 250,
      redirectUrl: "/mall-owner/dashboard",
      attemptCleanupInterval: 10 * 60 * 1000, // 10 min
      attemptRecordExpiry: 30 * 60 * 1000, // 30 min
    },
  },

  //Response messages for security (prevents information leakage)

  messages: {
    magicLink: {
      success:
        "If your email is registered, you will receive a login link shortly.",
      rateLimited: "Please wait before requesting another login link.",
      ipBlocked:
        "Access denied from this location. Please contact support if you believe this is an error.",
      accountDisabled:
        "Your account has been disabled. Please contact support.",
      internalError:
        "Unable to process your request at this time. Please try again later.",
    },
  },

  passwordReset: {
    minResponseTime: 200,
    sendPasswordChangeNotification: true,
    invalidateAllSessions: true,
    tokenExpiryMinutes: 60,
    maxAttemptsPerHour: 5,
    successMessage:
      "If an account exists with this email, you will receive a password reset link shortly.",
    linkExpiresInDisplay: "1 hour",
  },

  /**
   * Redirect URLs for different account types
   */
  redirectUrls: {
    login: {
      USER: "/auth/login",
      SELLER: "/auth/seller/login",
      MALL_OWNER: "/auth/mall-owner/login",
    },
    dashboard: {
      USER: "/dashboard",
      SELLER: "/seller/dashboard",
      MALL_OWNER: "/mall-owner/dashboard",
    },
  },
  setupAccount: {
    //Whether to automatically log in after setup
    autoLoginAfterSetup: true,
    // Whether to send welcome email after setup
    sendWelcomeEmail: true,
    minResponseTime: 200,
  },
  signup: {
    rateLimit: {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
    },
    sendVerificationEmail: true,
  },
  verifyEmail: {
    //Whether to send welcome email after verification
    sendWelcomeEmail: true,
    // Dashboard URL for welcome email
    dashboardUrl: "/dashboard",
    //Rate limit for resend requests (in seconds)
    resendCooldown: 60,
  },
  tokenRefresh: {
    //Whether to rotate refresh tokens on each refresh
    rotateRefreshToken: true,
    //Extend session expiry on refresh
    extendSessionOnRefresh: true,
    //Session extension duration in days
    sessionExtensionDays: 7,
    // Minimum response time to prevent timing attacks (ms)
    minResponseTime: 100,
    //Whether to invalidate all sessions on token reuse detection
    //Disabled: middleware proactive refresh and client-side 401 refresh can race,
    //causing the old refresh token to be sent after rotation — false positive reuse.
    invalidateOnTokenReuse: false,
  },

  routes: {
    /** Paths that don't require authentication */
    publicPaths: [
      "/",
      "/login",
      "/signup",
      "/verify-email",
      "/reset-password",
      "/forgot-password",
      "/setup-account",
      "/magic-link",
      "/seller/login",
      "/mall-owner/login",
      "/products",
      "/categories",
      "/search",
      "/about",
      "/contact",
      "/privacy",
      "/terms",
    ],

    /** Paths that require authentication */
    protectedPaths: [
      "/dashboard",
      "/profile",
      "/settings",
      "/orders",
      "/seller",
      "/advertiser",
      "/admin",
      "/mall-owner",
    ],

    /** Role-based path restrictions */
    roleRestrictions: [
      {
        pathPattern: "/seller",
        allowedRoles: ["SELLER"] as UserRole[],
        redirectPath: "/",
      },
      {
        pathPattern: "/admin",
        allowedRoles: ["MALL_OWNER"] as UserRole[],
        redirectPath: "/",
      },
      {
        pathPattern: "/mall-owner",
        allowedRoles: ["MALL_OWNER"] as UserRole[],
        redirectPath: "/",
      },
    ],

    /** Paths to exclude from middleware entirely */
    excludedPaths: [
      "/api",
      "/_next",
      "/favicon.ico",
      "/robots.txt",
      "/sitemap.xml",
    ],

    /** Default redirect for unauthenticated users */
    loginPath: "/login",

    /** Default redirect after login */
    defaultAuthenticatedPath: "/dashboard",

    /** Paths that should redirect if already authenticated */
    authRedirectPaths: ["/login", "/signup"],

    /** Role-based default dashboard paths */
    roleDashboards: {
      USER: "/dashboard",
      SELLER: "/seller/dashboard",
      MALL_OWNER: "/mall-owner/dashboard",
    } as Record<UserRole, string>,
  },

  verificationTokens: {
    /**
     * Token expiration times in milliseconds
     */
    expiration: {
      EMAIL_VERIFICATION: 24 * 60 * 60 * 1000, // 24 hours
      PASSWORD_RESET: 60 * 60 * 1000, // 1 hour
      MAGIC_LINK: 15 * 60 * 1000, // 15 minutes
    },

    /**
     * Rate limiting: minimum time between token requests (ms)
     */
    rateLimit: {
      EMAIL_VERIFICATION: 60 * 1000, // 1 minute
      PASSWORD_RESET: 60 * 1000, // 1 minute
      MAGIC_LINK: 30 * 1000, // 30 seconds
    },

    /**
     * URL paths for verification links
     */
    paths: {
      email: "/verify-email",
      reset: "/reset-password",
      magic: "/magic-link",
    },
  },

  /**
   * JWT token configuration
   */
  jwt: {
    issuer: "wholesale-market",
    accessAudience: "api",
    refreshAudience: "refresh",
  },
} as const;

export type AuthConfig = typeof AUTH_CONFIG;
export type EmailCheckConfig = typeof AUTH_CONFIG.emailCheck;
export type LoginConfig = typeof AUTH_CONFIG.login;
export type CookieConfig = typeof AUTH_CONFIG.cookies;
export type MallOwnerConfig = typeof AUTH_CONFIG.mallOwner;
export type PasswordResetConfig = typeof AUTH_CONFIG.passwordReset;
export type SetupAccountConfig = typeof AUTH_CONFIG.setupAccount;
export type SignupConfig = typeof AUTH_CONFIG.signup;
export type VerifyEmailConfig = typeof AUTH_CONFIG.verifyEmail;
export type TokenRefreshConfig = typeof AUTH_CONFIG.tokenRefresh;
export type RoutesConfig = typeof AUTH_CONFIG.routes;
