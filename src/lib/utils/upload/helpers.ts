import { env } from "@/env";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extracts file extension from filename.
 */
export function extractExtension(filename: string): string | null {
  const parts = filename.split(".");
  if (parts.length < 2) {
    return null;
  }
  const ext = parts.pop();
  return ext && ext.length > 0 && ext.length <= 10 ? ext : null;
}

/**
 * Generates a cryptographically random string.
 */
export function generateRandomString(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = new Uint8Array(length);

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < length; i++) {
      randomValues[i] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(randomValues)
    .map((v) => chars[v % chars.length])
    .join("");
}

/**
 * Formats bytes into human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Parses max file size from environment.
 */
export function parseMaxFileSize(): number {
  const envValue = env.MAX_FILE_SIZE;
  const parsed =
    typeof envValue === "string" ? parseInt(envValue, 10) : envValue;

  if (isNaN(parsed) || parsed <= 0) {
    throw new Error("Invalid MAX_FILE_SIZE configuration");
  }

  return parsed;
}

/**
 * Parses allowed file types from environment.
 */
export function parseAllowedTypes(): string[] {
  const types = env.ALLOWED_FILE_TYPES.split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (types.length === 0) {
    throw new Error("No ALLOWED_FILE_TYPES configured");
  }

  return types;
}
