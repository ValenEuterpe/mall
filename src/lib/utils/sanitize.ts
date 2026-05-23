// src/lib/utils/sanitize.ts

// ============================================================================
// STRING SANITIZATION
// ============================================================================

/**
 * Remove HTML tags from string
 */
export function stripHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

//Escape HTML special characters
export function escapeHtml(input: string): string {
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;",
  };
  return input.replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char);
}

/**
 * Remove control characters and null bytes
 */
export function removeControlChars(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * Normalize whitespace (collapse multiple spaces/newlines)
 */
export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

// ============================================================================
// FILE SANITIZATION
// ============================================================================

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  // Get extension
  const lastDot = filename.lastIndexOf(".");
  const name = lastDot > 0 ? filename.substring(0, lastDot) : filename;
  const ext = lastDot > 0 ? filename.substring(lastDot) : "";

  // Sanitize name part
  const sanitizedName = name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 200);

  // Sanitize extension
  const sanitizedExt = ext
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "")
    .substring(0, 10);

  return sanitizedName + sanitizedExt || "file";
}

/**
 * Get safe file extension
 */
export function getSafeExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return ext.replace(/[^a-z0-9]/g, "");
}

// ============================================================================
// URL SANITIZATION
// ============================================================================

/**
 * Sanitize URL - only allow http/https protocols
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Only allow http and https
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }

    // Remove credentials from URL
    parsed.username = "";
    parsed.password = "";

    return parsed.toString();
  } catch {
    return "";
  }
}

/**
 * Check if URL is safe (http/https only)
 */
export function isSafeUrl(url: string): boolean {
  return sanitizeUrl(url) !== "";
}

/**
 * Sanitize path (remove directory traversal attempts)
 */
export function sanitizePath(path: string): string {
  return path
    .replace(/\.\./g, "")
    .replace(/\/+/g, "/")
    .replace(/^\//, "")
    .replace(/\/$/, "");
}

// ============================================================================
// SQL/DATABASE SANITIZATION
// ============================================================================

/**
 * Escape SQL-like wildcards for LIKE queries
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}

/**
 * Sanitize search term for database queries
 */
export function sanitizeSearchTerm(term: string): string {
  return stripHtml(term)
    .replace(/[^\w\s-]/g, "")
    .trim()
    .substring(0, 100);
}

// ============================================================================
// SVG SANITIZATION
// ============================================================================

/**
 * Sanitize SVG content (remove scripts and event handlers)
 */
export function sanitizeSvg(svgContent: string): string {
  let sanitized = svgContent;

  // Remove script tags
  sanitized = sanitized.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ""
  );

  // Remove event handlers (on*)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");

  // Remove javascript: protocols
  sanitized = sanitized.replace(/javascript:/gi, "");

  // Remove data: protocols in hrefs, but preserve data:image/* (embedded images)
  sanitized = sanitized.replace(
    /href\s*=\s*["']data:(?!image\/)[^"']*["']/gi,
    ""
  );

  // Remove xlink:href with javascript or non-image data protocols
  sanitized = sanitized.replace(
    /xlink:href\s*=\s*["'](javascript|data:(?!image\/)):[^"']*["']/gi,
    ""
  );

  return sanitized;
}

// ============================================================================
// OBJECT SANITIZATION
// ============================================================================

/**
 * Recursively sanitize object values (strip HTML from strings)
 */
export function sanitizeObject<T>(obj: T): T {
  if (typeof obj === "string") {
    return stripHtml(obj.trim()) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject) as T;
  }

  if (obj !== null && typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject((obj as Record<string, unknown>)[key]);
      }
    }
    return sanitized as T;
  }

  return obj;
}

/**
 * Deep sanitize request body
 */
export function sanitizeRequestBody<T>(body: unknown): T {
  return sanitizeObject(body) as T;
}

// ============================================================================
// JSON SANITIZATION
// ============================================================================

/**
 * Safely parse JSON with size limit
 */
export function safeParseJson<T>(
  json: string,
  maxLength: number = 1024 * 1024 // 1MB default
): T | null {
  if (json.length > maxLength) {
    return null;
  }

  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Stringify with circular reference handling
 */
export function safeStringify(obj: unknown, space?: number): string {
  const seen = new WeakSet();

  return JSON.stringify(
    obj,
    (_, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      return value;
    },
    space
  );
}
