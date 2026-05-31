// src/utils/rate-limit.ts

import { LRUCache } from "lru-cache";
import { RateLimitError } from "@/lib/errors/custom-errors";
import { AUTH_CONFIG } from "@/lib/config/auth.config";

const verifyConfig = AUTH_CONFIG.mallOwner.verify;

// ============================================================================
// TYPES
// ============================================================================

interface RateLimitOptions {
  /** Time window in milliseconds */
  interval: number;
  /** Maximum requests per window */
  max: number;
  /** Max unique tokens to track */
  uniqueTokenPerInterval?: number;
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

interface AttemptRecord {
  count: number;
  lastAttempt: Date;
}

// ============================================================================
// PASSWORD ATTEMPT TRACKER
// ============================================================================

/**
 * In-memory password attempt tracker
 * For production, consider Redis or similar
 */
class PasswordAttemptTracker {
  private attempts = new Map<string, AttemptRecord>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
  }

  /**
   * Track a password attempt for a token
   */
  track(token: string): {
    allowed: boolean;
    remainingAttempts: number;
  } {
    const existing = this.attempts.get(token);
    const now = new Date();
    const maxAttempts = verifyConfig.maxPasswordAttempts;

    if (!existing) {
      this.attempts.set(token, { count: 1, lastAttempt: now });
      return {
        allowed: true,
        remainingAttempts: maxAttempts - 1,
      };
    }

    // Check if we've exceeded max attempts
    if (existing.count >= maxAttempts) {
      return { allowed: false, remainingAttempts: 0 };
    }

    // Increment attempt count
    existing.count++;
    existing.lastAttempt = now;
    this.attempts.set(token, existing);

    return {
      allowed: true,
      remainingAttempts: maxAttempts - existing.count,
    };
  }

  /**
   * Clear attempts for a token
   */
  clear(token: string): void {
    this.attempts.delete(token);
  }

  /**
   * Get current attempt count for a token
   */
  getCount(token: string): number {
    return this.attempts.get(token)?.count ?? 0;
  }

  /**
   * Start periodic cleanup of old entries
   */
  private startCleanup(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      const cutoff = new Date(Date.now() - verifyConfig.attemptRecordExpiry);

      for (const [token, data] of this.attempts.entries()) {
        if (data.lastAttempt < cutoff) {
          this.attempts.delete(token);
        }
      }
    }, verifyConfig.attemptCleanupInterval);

    // Don't prevent process exit
    this.cleanupInterval.unref?.();
  }

  /**
   * Stop cleanup (for testing)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
export const passwordAttemptTracker = new PasswordAttemptTracker();

// ============================================================================
// RATE LIMITER CLASS
// ============================================================================

/**
 * Token bucket rate limiter using LRU cache
 */
export class RateLimiter {
  private cache: LRUCache<string, RateLimitInfo>;
  private interval: number;
  private max: number;

  constructor(options: RateLimitOptions) {
    this.interval = options.interval;
    this.max = options.max;

    this.cache = new LRUCache({
      max: options.uniqueTokenPerInterval ?? 500,
      ttl: options.interval,
    });
  }

  /**
   * Check rate limit and throw if exceeded
   */
  async check(identifier: string, limit?: number): Promise<void> {
    const result = this.tryConsume(identifier, limit);

    if (!result.success) {
      const resetIn = Math.ceil((result.reset * 1000 - Date.now()) / 1000);
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${resetIn} seconds`,
        resetIn
      );
    }
  }

  /**
   * Try to consume a request, returns result without throwing
   */
  tryConsume(identifier: string, limit?: number): RateLimitResult {
    const maxAllowed = limit ?? this.max;
    const now = Date.now();
    const entry = this.cache.get(identifier);

    // First request or window expired
    if (!entry || now > entry.resetTime) {
      const resetTime = now + this.interval;
      this.cache.set(identifier, { count: 1, resetTime });

      return {
        success: true,
        limit: maxAllowed,
        remaining: maxAllowed - 1,
        reset: Math.ceil(resetTime / 1000),
      };
    }

    // Check if limit exceeded
    if (entry.count >= maxAllowed) {
      return {
        success: false,
        limit: maxAllowed,
        remaining: 0,
        reset: Math.ceil(entry.resetTime / 1000),
      };
    }

    // Increment count
    entry.count++;
    this.cache.set(identifier, entry);

    return {
      success: true,
      limit: maxAllowed,
      remaining: maxAllowed - entry.count,
      reset: Math.ceil(entry.resetTime / 1000),
    };
  }

  /**
   * Get remaining requests for an identifier
   */
  getRemainingRequests(identifier: string, limit?: number): number {
    const maxAllowed = limit ?? this.max;
    const entry = this.cache.get(identifier);

    if (!entry || Date.now() > entry.resetTime) {
      return maxAllowed;
    }

    return Math.max(0, maxAllowed - entry.count);
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    this.cache.delete(identifier);
  }
}

// ============================================================================
// PRE-CONFIGURED RATE LIMITERS
// ============================================================================

/**
 * General API rate limiter
 * 500 requests per 15 minutes (increased for development)
 * Note: In production, consider reducing to 100-200
 */
export const apiRateLimiter = new RateLimiter({
  interval: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "development" ? 1000 : 500,
  uniqueTokenPerInterval: 1000,
});

/**
 * Authentication rate limiter (login, signup, password reset)
 * 5 attempts per 15 minutes
 */
export const authRateLimiter = new RateLimiter({
  interval: 15 * 60 * 1000,
  max: 5,
  uniqueTokenPerInterval: 500,
});

/**
 * Signup rate limiter
 * 5 signups per 15 minutes per IP
 */
export const signupRateLimiter = new RateLimiter({
  interval: 15 * 60 * 1000,
  max: 5,
  uniqueTokenPerInterval: 500,
});

/**
 * Upload rate limiter
 * 20 uploads per hour
 */
export const uploadRateLimiter = new RateLimiter({
  interval: 60 * 60 * 1000,
  max: 20,
  uniqueTokenPerInterval: 500,
});

/**
 * Email sending rate limiter
 * 10 emails per hour
 */
export const emailRateLimiter = new RateLimiter({
  interval: 60 * 60 * 1000,
  max: 10,
  uniqueTokenPerInterval: 500,
});

/**
 * Public read endpoint rate limiter
 * 200 requests per minute per IP — generous for normal browsing,
 * stops single-actor scraping/abuse from exhausting the DB pool.
 */
export const publicReadRateLimiter = new RateLimiter({
  interval: 60 * 1000,
  max: 200,
  uniqueTokenPerInterval: 1000,
});

/**
 * Analytics/tracking rate limiter (e.g., product view tracking).
 * 60 events per minute per IP — high enough for fast browsing, low enough
 * to prevent vanity-metric inflation from a single client.
 */
export const analyticsRateLimiter = new RateLimiter({
  interval: 60 * 1000,
  max: 60,
  uniqueTokenPerInterval: 1000,
});

/**
 * Translation/AI rate limiter — Gemini calls cost money.
 * 30 calls per hour per user.
 */
export const translationRateLimiter = new RateLimiter({
  interval: 60 * 60 * 1000,
  max: 30,
  uniqueTokenPerInterval: 500,
});

/**
 * Apply a rate limit to a request and return a 429 NextResponse if exceeded.
 * Returns null when the request should proceed.
 *
 * Use in routes that don't go through `withMiddleware`.
 */
export function enforceRateLimit(
  request: Request,
  limiter: RateLimiter,
  userId?: string
): {
  response: import("next/server").NextResponse;
  result: RateLimitResult;
} | null {
  const identifier = getRateLimitIdentifier(request, userId);
  const result = limiter.tryConsume(identifier);
  if (result.success) return null;

  const headers = createRateLimitHeaders(result);
  // Lazy import to avoid pulling next/server in non-route contexts
  const { NextResponse } =
    require("next/server") as typeof import("next/server");
  const response = NextResponse.json(
    {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please try again later.",
      },
    },
    { status: 429, headers }
  );
  return { response, result };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get rate limit identifier from request
 */
export function getRateLimitIdentifier(
  request: Request,
  userId?: string
): string {
  if (userId) {
    return `user:${userId}`;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";

  return `ip:${ip}`;
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(
  result: RateLimitResult
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
    ...(result.success
      ? {}
      : {
          "Retry-After": String(result.reset - Math.floor(Date.now() / 1000)),
        }),
  };
}
