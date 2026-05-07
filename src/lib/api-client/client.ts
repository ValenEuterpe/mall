"use client";

import { toast } from "@/lib/utils/toast";

// ============================================================================
// Token Refresh Queue (Race Condition Prevention)
// ============================================================================

/**
 * Manages token refresh to prevent race conditions when multiple
 * requests fail with 401 simultaneously.
 */
class TokenRefreshManager {
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: boolean) => void;
    reject: (error: Error) => void;
  }> = [];

  /**
   * Process the queue after refresh attempt
   */
  private processQueue(success: boolean, error?: Error): void {
    this.failedQueue.forEach((promise) => {
      if (success) {
        promise.resolve(true);
      } else {
        promise.reject(error || new Error("Token refresh failed"));
      }
    });
    this.failedQueue = [];
  }

  /**
   * Attempt to refresh the token.
   * If already refreshing, queue the request.
   * Returns true if refresh succeeded, false otherwise.
   */
  async refreshToken(): Promise<boolean> {
    // If already refreshing, wait in queue
    if (this.isRefreshing) {
      return new Promise<boolean>((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      const response = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        this.processQueue(true);
        return true;
      } else {
        const error = new Error("Token refresh failed");
        this.processQueue(false, error);
        return false;
      }
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Token refresh failed");
      this.processQueue(false, err);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Check if currently refreshing
   */
  get refreshing(): boolean {
    return this.isRefreshing;
  }
}

// Singleton instance
const tokenRefreshManager = new TokenRefreshManager();

// ============================================================================
// CSRF Token Manager
// ============================================================================

/**
 * Manages the in-memory CSRF token. The cookie half is HttpOnly so JS can't
 * read it; we fetch the matching value from /api/v1/csrf and echo it via the
 * x-csrf-token header on unsafe methods.
 */
class CsrfTokenManager {
    private token: string | null = null;
    private fetching: Promise<string | null> | null = null;

    setToken(token: string | null): void {
        this.token = token;
    }

    getToken(): string | null {
        return this.token;
    }

    /**
     * Fetch a CSRF token from the server. Coalesces concurrent requests.
     */
    async fetchToken(): Promise<string | null> {
        if (this.token) return this.token;
        if (this.fetching) return this.fetching;

        this.fetching = (async () => {
            try {
                const response = await fetch("/api/v1/csrf", {
                    method: "GET",
                    credentials: "include",
                });
                if (!response.ok) return null;
                const body = (await response.json()) as
                    | { success: true; data: { csrfToken: string } }
                    | { success: false };
                if (!("success" in body) || !body.success) return null;
                this.token = body.data.csrfToken;
                return this.token;
            } catch {
                return null;
            } finally {
                this.fetching = null;
            }
        })();

        return this.fetching;
    }

    clear(): void {
        this.token = null;
        this.fetching = null;
    }
}

const csrfTokenManager = new CsrfTokenManager();

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
  status?: number;
  details?: unknown;
  timestamp?: string;
  path?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  hasPrevious: boolean;
  [key: string]: unknown;
}

export type ApiResponse<T = unknown> =
  | { success: true; data: T; message?: string; meta?: PaginationMeta }
  | { success: false; error: ApiError };

export interface RequestConfig extends Omit<RequestInit, "body" | "headers"> {
  /** Query parameters */
  params?: Record<string, string | number | boolean | undefined | null>;
  /** Request body (will be serialized) */
  body?: unknown;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Number of retry attempts (default: 0) */
  retries?: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number;
  /** Show error toast on failure (default: true) */
  showErrorToast?: boolean;
  /** Show success toast on success (default: false) */
  showSuccessToast?: boolean;
  /** Success message for toast */
  successMessage?: string;
  /** Custom error message for toast */
  errorMessage?: string;
  /** Abort signal for request cancellation */
  signal?: AbortSignal;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Response type */
  responseType?: "json" | "blob" | "text" | "arrayBuffer";
  /** Skip automatic 401 refresh retry (default: false) */
  skipAuthRetry?: boolean;
  /** Skip automatic CSRF token attach + 403 retry (default: false) */
  skipCsrf?: boolean;
  /** Internal flag to track if this is a retry after refresh */
  _isRetryAfterRefresh?: boolean;
  /** Internal flag to track if this is a retry after CSRF token fetch */
  _isRetryAfterCsrf?: boolean;
}

export interface UploadConfig extends Omit<RequestConfig, "body"> {
  /** Progress callback */
  onProgress?: (progress: number) => void;
  /** Additional form data fields */
  additionalData?: Record<string, string | Blob>;
  /** Field name for file (default: "file") */
  fieldName?: string;
}

type RequestInterceptor = (
  config: RequestConfig
) => RequestConfig | Promise<RequestConfig>;

// Response interceptors must be non-generic to avoid breaking type inference.
// They can inspect/transform the envelope but should not assume `T`.
type ResponseInterceptor = (
  response: ApiResponse<any>
) => ApiResponse<any> | Promise<ApiResponse<any>>;

type ErrorInterceptor = (
  error: ApiClientError
) => ApiClientError | Promise<ApiClientError>;

// ============================================================================
// Custom Error Class
// ============================================================================

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;
  public readonly isNetworkError: boolean;
  public readonly isTimeout: boolean;
  public readonly isAborted: boolean;
  public readonly originalError?: Error;

  constructor(
    message: string,
    options: {
      code?: string;
      status?: number;
      details?: unknown;
      isNetworkError?: boolean;
      isTimeout?: boolean;
      isAborted?: boolean;
      originalError?: Error;
    } = {}
  ) {
    super(message);
    this.name = "ApiClientError";
    this.code = options.code || "UNKNOWN_ERROR";
    this.status = options.status || 0;
    this.details = options.details;
    this.isNetworkError = options.isNetworkError || false;
    this.isTimeout = options.isTimeout || false;
    this.isAborted = options.isAborted || false;
    this.originalError = options.originalError;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiClientError);
    }
  }

  isServerError(): boolean {
    return this.status >= 500;
  }

  isRetryable(): boolean {
    return (
      this.isNetworkError ||
      this.isTimeout ||
      this.isServerError() ||
      this.status === 429
    );
  }
}

// ============================================================================
// API Client Class
// ============================================================================

export class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private defaultRetries: number;
  private defaultRetryDelay: number;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  constructor(
    options: {
      baseUrl?: string;
      timeout?: number;
      retries?: number;
      retryDelay?: number;
    } = {}
  ) {
    this.baseUrl = options.baseUrl || "/api/v1";
    this.defaultTimeout = options.timeout || 30000;
    this.defaultRetries = options.retries || 0;
    this.defaultRetryDelay = options.retryDelay || 1000;
  }

  // --------------------------------------------------------------------------
  // Interceptors
  // --------------------------------------------------------------------------

  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index > -1) this.requestInterceptors.splice(index, 1);
    };
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor);
      if (index > -1) this.responseInterceptors.splice(index, 1);
    };
  }

  addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor);
    return () => {
      const index = this.errorInterceptors.indexOf(interceptor);
      if (index > -1) this.errorInterceptors.splice(index, 1);
    };
  }

  // --------------------------------------------------------------------------
  // Core request
  // --------------------------------------------------------------------------

  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      params,
      body,
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      retryDelay = this.defaultRetryDelay,
      showErrorToast = true,
      showSuccessToast = false,
      successMessage,
      errorMessage,
      signal,
      headers = {},
      responseType = "json",
      skipAuthRetry = false,
      skipCsrf = false,
      _isRetryAfterRefresh = false,
      _isRetryAfterCsrf = false,
      ...fetchOptions
    } = config;

    const method = (fetchOptions.method || "GET").toUpperCase();
    const needsCsrf = !skipCsrf && UNSAFE_METHODS.has(method);

    let finalConfig: RequestConfig = { params, body, headers, ...fetchOptions };
    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(finalConfig);
    }

    let url = `${this.baseUrl}${endpoint}`;
    if (finalConfig.params) {
      const searchParams = new URLSearchParams();
      Object.entries(finalConfig.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) url += `?${queryString}`;
    }

    const requestHeaders: Record<string, string> = {
      ...finalConfig.headers,
    };

    if (finalConfig.body !== undefined && finalConfig.body !== null) {
      requestHeaders["Content-Type"] =
        requestHeaders["Content-Type"] ?? "application/json";
    }

    if (needsCsrf) {
      const csrfToken =
        csrfTokenManager.getToken() ?? (await csrfTokenManager.fetchToken());
      if (csrfToken) {
        requestHeaders["x-csrf-token"] = csrfToken;
      }
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeout);
    const combinedSignal = signal
      ? this.combineAbortSignals(signal, abortController.signal)
      : abortController.signal;

    let lastError: ApiClientError | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...fetchOptions,
          method: fetchOptions.method || "GET",
          headers: requestHeaders,
          body:
            finalConfig.body !== undefined && finalConfig.body !== null
              ? JSON.stringify(finalConfig.body)
              : undefined,
          credentials: "include",
          signal: combinedSignal,
        });

        clearTimeout(timeoutId);

        let data: ApiResponse<T>;

        if (responseType === "blob") {
          const blob = await response.blob();
          data = response.ok
            ? { success: true, data: blob as unknown as T }
            : ({
                success: false,
                error: {
                  code: `HTTP_${response.status}`,
                  message: "Request failed",
                },
              } as ApiResponse<T>);
        } else if (responseType === "text") {
          const text = await response.text();
          data = response.ok
            ? { success: true, data: text as unknown as T }
            : ({
                success: false,
                error: {
                  code: `HTTP_${response.status}`,
                  message: text || "Request failed",
                },
              } as ApiResponse<T>);
        } else if (responseType === "arrayBuffer") {
          const buffer = await response.arrayBuffer();
          data = response.ok
            ? { success: true, data: buffer as unknown as T }
            : ({
                success: false,
                error: {
                  code: `HTTP_${response.status}`,
                  message: "Request failed",
                },
              } as ApiResponse<T>);
        } else {
          const text = await response.text();
          data = text
            ? (JSON.parse(text) as ApiResponse<T>)
            : ({ success: true, data: undefined as T } as ApiResponse<T>);
        }

        if (!response.ok) {
          const error = this.createError(response, data);

          // Handle 403 CSRF_ERROR - fetch a fresh token and retry once
          if (
            response.status === 403 &&
            error.code === "CSRF_ERROR" &&
            !skipCsrf &&
            !_isRetryAfterCsrf
          ) {
            csrfTokenManager.clear();
            const refreshed = await csrfTokenManager.fetchToken();
            if (refreshed) {
              return this.request<T>(endpoint, {
                ...config,
                _isRetryAfterCsrf: true,
              });
            }
          }

          // Handle 401 Unauthorized - attempt token refresh and retry
          if (
            response.status === 401 &&
            !skipAuthRetry &&
            !_isRetryAfterRefresh
          ) {
            try {
              const refreshSucceeded = await tokenRefreshManager.refreshToken();

              if (refreshSucceeded) {
                // Retry the original request with new token
                return this.request<T>(endpoint, {
                  ...config,
                  _isRetryAfterRefresh: true,
                });
              } else {
                // Refresh failed - redirect to login
                this.handleAuthFailure();
              }
            } catch {
              // Refresh threw an error - redirect to login
              this.handleAuthFailure();
            }
          }

          let finalError = error;
          for (const interceptor of this.errorInterceptors) {
            finalError = await interceptor(finalError);
          }

          if (showErrorToast) {
            toast.error(errorMessage || finalError.message);
          }

          throw finalError;
        }

        // Apply response interceptors (non-generic). We cast back to ApiResponse<T>
        // because interceptors must preserve the envelope shape.
        let finalResponse: ApiResponse<any> = data;
        for (const interceptor of this.responseInterceptors) {
          finalResponse = await interceptor(finalResponse);
        }

        if (showSuccessToast && successMessage) {
          toast.success(successMessage);
        }

        return finalResponse as ApiResponse<T>;
      } catch (err) {
        clearTimeout(timeoutId);

        const apiError = this.handleError(err);
        lastError = apiError;

        if (apiError.isAborted || !apiError.isRetryable()) {
          let finalError = apiError;
          for (const interceptor of this.errorInterceptors) {
            finalError = await interceptor(finalError);
          }

          if (showErrorToast && !apiError.isAborted) {
            toast.error(errorMessage || finalError.message);
          }

          throw finalError;
        }

        if (attempt < retries) {
          await this.delay(retryDelay * Math.pow(2, attempt));
        }
      }
    }

    if (lastError) {
      if (showErrorToast) toast.error(errorMessage || lastError.message);
      throw lastError;
    }

    throw new ApiClientError("Request failed", { code: "UNKNOWN_ERROR" });
  }

  // --------------------------------------------------------------------------
  // HTTP Methods
  // --------------------------------------------------------------------------

  get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined | null>,
    config?: Omit<RequestConfig, "params" | "body" | "method">
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, params, method: "GET" });
  }

  post<T>(
    endpoint: string,
    body?: unknown,
    config?: Omit<RequestConfig, "body" | "method">
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, body, method: "POST" });
  }

  put<T>(
    endpoint: string,
    body: unknown,
    config?: Omit<RequestConfig, "body" | "method">
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, body, method: "PUT" });
  }

  patch<T>(
    endpoint: string,
    body: unknown,
    config?: Omit<RequestConfig, "body" | "method">
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, body, method: "PATCH" });
  }

  delete<T>(
    endpoint: string,
    config?: Omit<RequestConfig, "method">
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "DELETE" });
  }

  // --------------------------------------------------------------------------
  // Upload (with optional XHR progress)
  // --------------------------------------------------------------------------

  async upload<T>(
    endpoint: string,
    file: File | Blob,
    config: UploadConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      onProgress,
      additionalData,
      fieldName = "file",
      timeout = 60000,
      showErrorToast = true,
      showSuccessToast = false,
      successMessage,
      errorMessage,
      signal,
    } = config;

    const formData = new FormData();
    formData.append(fieldName, file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    if (onProgress) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        });

        xhr.addEventListener("load", () => {
          try {
            const data = JSON.parse(xhr.responseText) as ApiResponse<T>;

            if (xhr.status >= 200 && xhr.status < 300) {
              if (showSuccessToast && successMessage)
                toast.success(successMessage);
              resolve(data);
              return;
            }

            const err = this.createError(
              { ok: false, status: xhr.status } as Response,
              data
            );
            if (showErrorToast) toast.error(errorMessage || err.message);
            reject(err);
          } catch {
            const err = new ApiClientError("Failed to parse response", {
              code: "PARSE_ERROR",
              status: xhr.status,
            });
            if (showErrorToast) toast.error(errorMessage || err.message);
            reject(err);
          }
        });

        xhr.addEventListener("error", () => {
          const err = new ApiClientError("Network error", {
            code: "NETWORK_ERROR",
            isNetworkError: true,
          });
          if (showErrorToast) toast.error(errorMessage || err.message);
          reject(err);
        });

        xhr.addEventListener("abort", () => {
          reject(
            new ApiClientError("Upload cancelled", {
              code: "ABORTED",
              isAborted: true,
            })
          );
        });

        xhr.addEventListener("timeout", () => {
          const err = new ApiClientError("Upload timeout", {
            code: "TIMEOUT",
            isTimeout: true,
          });
          if (showErrorToast) toast.error(errorMessage || err.message);
          reject(err);
        });

        xhr.open("POST", `${this.baseUrl}${endpoint}`);
        xhr.timeout = timeout;
        xhr.withCredentials = true;

        if (signal) {
          signal.addEventListener("abort", () => xhr.abort());
        }

        xhr.send(formData);
      });
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      body: formData,
      credentials: "include",
      signal,
    });

    const data = (await response.json()) as ApiResponse<T>;

    if (!response.ok) {
      const err = this.createError(response, data);
      if (showErrorToast) toast.error(errorMessage || err.message);
      throw err;
    }

    if (showSuccessToast && successMessage) toast.success(successMessage);

    return data;
  }

  async download(
    endpoint: string,
    filename?: string,
    config?: Omit<RequestConfig, "responseType">
  ): Promise<void> {
    const response = await this.request<Blob>(endpoint, {
      ...config,
      responseType: "blob",
    });

    if (response.success && response.data) {
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  }

  createAbortController(): AbortController {
    return new AbortController();
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  /** Pre-seed the CSRF token (e.g., from a login response). */
  setCsrfToken(token: string | null): void {
    csrfTokenManager.setToken(token);
  }

  /** Forget the CSRF token (e.g., on logout). Next mutation will re-fetch. */
  clearCsrfToken(): void {
    csrfTokenManager.clear();
  }

  // --------------------------------------------------------------------------
  // Auth Helpers
  // --------------------------------------------------------------------------

  /**
   * Handle authentication failure - clear state and redirect to login
   */
  private handleAuthFailure(): void {
    csrfTokenManager.clear();
    if (typeof window === "undefined") return;

    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;

    // Get current locale from URL if present
    const pathParts = currentPath.split("/");
    const localeMatch = pathParts[1]?.match(/^(en|ru|am)$/);
    const locale = localeMatch ? localeMatch[0] : "en";

    // Check if we're already on an auth page (login, signup, etc.)
    // to avoid infinite redirect loops
    const authPaths = [
      "/login",
      "/signup",
      "/reset-password",
      "/verify-email",
      "/admin-login",
      "/mall-owner",
    ];
    const isAuthPage = authPaths.some((path) => currentPath.includes(path));

    if (isAuthPage) {
      // Already on auth page - don't redirect, just stay there
      // Clear any lingering callback params to prevent loops
      if (currentSearch.includes("callbackUrl")) {
        window.location.href = `/${locale}${currentPath.replace(`/${locale}`, "")}`;
      }
      return;
    }

    // Redirect to login page with callback
    const callbackUrl = encodeURIComponent(currentPath + currentSearch);
    window.location.href = `/${locale}/login?callbackUrl=${callbackUrl}`;
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private createError(
    response: Response,
    data: ApiResponse<any>
  ): ApiClientError {
    if (
      data &&
      typeof data === "object" &&
      "success" in data &&
      data.success === false
    ) {
      return new ApiClientError(
        data.error.message || `Request failed with status ${response.status}`,
        {
          code: data.error.code || `HTTP_${response.status}`,
          status: response.status,
          details: data.error.details,
        }
      );
    }

    return new ApiClientError(`Request failed with status ${response.status}`, {
      code: `HTTP_${response.status}`,
      status: response.status,
    });
  }

  private handleError(error: unknown): ApiClientError {
    if (error instanceof ApiClientError) return error;

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return new ApiClientError("Request cancelled", {
          code: "ABORTED",
          isAborted: true,
          originalError: error,
        });
      }

      if (error.message.toLowerCase().includes("timeout")) {
        return new ApiClientError("Request timeout", {
          code: "TIMEOUT",
          isTimeout: true,
          originalError: error,
        });
      }

      if (
        error.message.toLowerCase().includes("network") ||
        error.message.toLowerCase().includes("fetch")
      ) {
        return new ApiClientError(
          "Network error. Please check your connection.",
          {
            code: "NETWORK_ERROR",
            isNetworkError: true,
            originalError: error,
          }
        );
      }

      return new ApiClientError(error.message, {
        code: "UNKNOWN_ERROR",
        originalError: error,
      });
    }

    return new ApiClientError("An unexpected error occurred", {
      code: "UNKNOWN_ERROR",
    });
  }

  private combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener("abort", () => controller.abort());
    }

    return controller.signal;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const apiClient = new ApiClient();
