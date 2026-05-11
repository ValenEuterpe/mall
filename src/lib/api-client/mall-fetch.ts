"use client";

/**
 * Minimal fetch shim for mall-owner components that still use raw `fetch()`.
 *
 * Attaches the `x-csrf-token` header on unsafe methods and retries once on a
 * 403 CSRF_ERROR after refetching the token. Response shape is unchanged —
 * callers parse JSON exactly as they would with `fetch`.
 *
 * This is a stopgap so we don't have to rewrite ~50 call sites onto the full
 * `apiClient` envelope/error-throwing API. Prefer `apiClient` in new code.
 */

const CSRF_ENDPOINT = "/api/v1/csrf";
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

let cachedToken: string | null = null;
let inFlight: Promise<string | null> | null = null;

async function fetchCsrfToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch(CSRF_ENDPOINT, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) return null;
      const body = (await res.json()) as
        | { success: true; data: { csrfToken: string } }
        | { success: false };
      if (!("success" in body) || !body.success) return null;
      cachedToken = body.data.csrfToken;
      return cachedToken;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

function clearCsrfToken(): void {
  cachedToken = null;
}

function normalizeMethod(init?: RequestInit): string {
  return (init?.method ?? "GET").toUpperCase();
}

async function isCsrfError(res: Response): Promise<boolean> {
  if (res.status !== 403) return false;
  try {
    const cloned = res.clone();
    const body = (await cloned.json()) as {
      success?: boolean;
      error?: { code?: string };
    };
    return body?.error?.code === "CSRF_ERROR";
  } catch {
    return false;
  }
}

/**
 * Drop-in replacement for `fetch` that handles CSRF for mall-owner endpoints.
 * Signature and return type match `fetch` exactly.
 */
export async function mallApiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = normalizeMethod(init);
  const needsCsrf = UNSAFE_METHODS.has(method);

  const buildInit = async (): Promise<RequestInit> => {
    const headers = new Headers(init?.headers);
    if (needsCsrf) {
      const token = await fetchCsrfToken();
      if (token) headers.set("x-csrf-token", token);
    }
    return {
      credentials: "include",
      ...init,
      method,
      headers,
    };
  };

  const firstInit = await buildInit();
  const res = await fetch(input, firstInit);

  if (needsCsrf && (await isCsrfError(res))) {
    clearCsrfToken();
    const refreshed = await fetchCsrfToken();
    if (refreshed) {
      const retryInit = await buildInit();
      return fetch(input, retryInit);
    }
  }

  return res;
}
