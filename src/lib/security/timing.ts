// src/lib/security/timing.ts

/**
 * Ensure minimum response time to prevent timing attacks
 *
 * Timing attacks can reveal information based on response time differences.
 * This function ensures all responses take at least a minimum amount of time.
 *
 * @param startTime - The timestamp when the request started (Date.now())
 * @param minResponseTime - Minimum response time in milliseconds
 */
export async function ensureMinResponseTime(
  startTime: number,
  minResponseTime: number
): Promise<void> {
  const elapsed = Date.now() - startTime;
  const remaining = minResponseTime - elapsed;

  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

/**
 * Create a timing-safe response wrapper
 *
 * @param minResponseTime - Minimum response time in milliseconds
 * @returns A wrapper function that ensures minimum response time
 */
export function createTimingSafeHandler<T>(
  minResponseTime: number
): (handler: () => Promise<T>) => Promise<T> {
  return async (handler: () => Promise<T>): Promise<T> => {
    const startTime = Date.now();
    try {
      return await handler();
    } finally {
      await ensureMinResponseTime(startTime, minResponseTime);
    }
  };
}

/**
 * Constant-time string comparison to prevent timing attacks
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do the comparison to maintain constant time
    b = a;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0 && a.length === b.length;
}
