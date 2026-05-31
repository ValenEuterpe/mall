// src/lib/security/headers.ts

import { NextResponse } from "next/server";

// ============================================================================
// CONFIGURATION
// ============================================================================

interface SecurityHeadersConfig {
  /** Enable Content-Security-Policy */
  enableCSP: boolean;
  /** Custom CSP directives */
  cspDirectives?: Partial<CSPDirectives>;
  /** Enable Strict-Transport-Security (HTTPS only) */
  enableHSTS: boolean;
  /** Enable X-Frame-Options */
  enableFrameOptions: boolean;
  /** Frame options value */
  frameOptions: "DENY" | "SAMEORIGIN";
  /** Additional custom headers */
  customHeaders?: Record<string, string>;
}

interface CSPDirectives {
  "default-src": string[];
  "script-src": string[];
  "style-src": string[];
  "img-src": string[];
  "font-src": string[];
  "connect-src": string[];
  "frame-ancestors": string[];
  "object-src": string[];
  "base-uri": string[];
  "form-action": string[];
}

const DEFAULT_CONFIG: SecurityHeadersConfig = {
  enableCSP: true,
  enableHSTS: process.env.NODE_ENV === "production",
  enableFrameOptions: true,
  frameOptions: "DENY",
};

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Production: keep 'unsafe-inline' for scripts because Next.js still emits a
// small inline bootstrap script. Drop 'unsafe-eval' — neither React 19 nor
// Next 16 (Turbopack) need it at runtime. Migrating to nonce-based CSP for
// the bootstrap script is a separate effort.
const DEFAULT_CSP_DIRECTIVES: CSPDirectives = {
  "default-src": ["'self'"],
  "script-src": IS_PRODUCTION
    ? ["'self'", "'unsafe-inline'"]
    : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "https:", "blob:"],
  "font-src": ["'self'", "data:"],
  // Sentry traffic is tunneled through /monitoring (same-origin), so 'self'
  // is enough. Add ingest hosts here only if the tunnel is disabled.
  "connect-src": ["'self'"],
  "frame-ancestors": ["'none'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
};

// ============================================================================
// HEADER BUILDERS
// ============================================================================

/**
 * Build Content-Security-Policy header value
 */
function buildCSP(directives: CSPDirectives): string {
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
}

/**
 * Merge CSP directives with defaults
 */
function mergeCSPDirectives(custom?: Partial<CSPDirectives>): CSPDirectives {
  if (!custom) return DEFAULT_CSP_DIRECTIVES;

  return Object.keys(DEFAULT_CSP_DIRECTIVES).reduce((acc, key) => {
    const directive = key as keyof CSPDirectives;
    acc[directive] = custom[directive] || DEFAULT_CSP_DIRECTIVES[directive];
    return acc;
  }, {} as CSPDirectives);
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Add security headers to response
 *
 * @example
 * ```ts
 * // Basic usage
 * const response = NextResponse.json({ data });
 * return addSecurityHeaders(response);
 *
 * // Custom configuration
 * return addSecurityHeaders(response, {
 *   frameOptions: "SAMEORIGIN",
 *   cspDirectives: {
 *     "script-src": ["'self'", "https://cdn.example.com"],
 *   },
 * });
 * ```
 */
export function addSecurityHeaders(
  response: NextResponse,
  config: Partial<SecurityHeadersConfig> = {}
): NextResponse {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Prevent clickjacking
  if (mergedConfig.enableFrameOptions) {
    response.headers.set("X-Frame-Options", mergedConfig.frameOptions);
  }

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Enable XSS protection (legacy, but still useful)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy
  if (mergedConfig.enableCSP) {
    const cspDirectives = mergeCSPDirectives(mergedConfig.cspDirectives);
    response.headers.set("Content-Security-Policy", buildCSP(cspDirectives));
  }

  // Strict Transport Security (HTTPS only)
  if (mergedConfig.enableHSTS) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  // Permissions Policy
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  // Cross-Origin policies
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");

  // Custom headers
  if (mergedConfig.customHeaders) {
    Object.entries(mergedConfig.customHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  return response;
}

/**
 * Remove sensitive headers from response
 */
export function removeSensitiveHeaders(response: NextResponse): NextResponse {
  const sensitiveHeaders = ["X-Powered-By", "Server"];

  sensitiveHeaders.forEach((header) => {
    response.headers.delete(header);
  });

  return response;
}

/**
 * Path prefixes safe to expose with permissive CORS (no cookies, public reads).
 * Anything outside these prefixes should be same-origin only.
 */
const PUBLIC_CORS_PREFIXES = [
  "/api/v1/public/",
  "/api/v1/products",
  "/api/v1/mall/categories",
  "/api/v1/mall/info",
  "/api/v1/mall/about",
] as const;

/**
 * Add CORS headers for API responses.
 *
 * Defaults are conservative: origin defaults to NEXT_PUBLIC_APP_URL, credentials
 * are NOT enabled, and OPTIONS-only requests get tight allow lists. Pass
 * `{ origin: "*" }` explicitly for genuinely public read endpoints.
 */
export function addCorsHeaders(
  response: NextResponse,
  options: {
    origin?: string | string[];
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
    maxAge?: number;
  } = {}
): NextResponse {
  const defaultOrigin =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "*";

  const {
    origin = defaultOrigin,
    methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    headers = ["Content-Type", "Authorization", "X-CSRF-Token"],
    credentials = false,
    maxAge = 86400,
  } = options;

  const allowedOrigin = Array.isArray(origin) ? origin.join(", ") : origin;

  response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  response.headers.set("Access-Control-Allow-Methods", methods.join(", "));
  response.headers.set("Access-Control-Allow-Headers", headers.join(", "));
  response.headers.set("Access-Control-Max-Age", String(maxAge));

  if (credentials) {
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  return response;
}

/**
 * Decide whether a path should expose permissive CORS (origin: "*"). All other
 * paths get no CORS headers — browsers treat them as same-origin only, which
 * is what we want for auth/admin/seller mutation endpoints.
 */
export function isPublicCorsPath(pathname: string): boolean {
  return PUBLIC_CORS_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
