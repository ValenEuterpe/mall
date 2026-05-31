// src/types/errors.ts
// Shared error code types to maintain DRY principles

// ============================================================================
// BASE ERROR CODES
// ============================================================================

/**
 * Common error codes used across all endpoints
 */
export type BaseErrorCode =
  | "VALIDATION_ERROR"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

/**
 * Authentication-related error codes
 */
export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_LOCKED"
  | "ACCOUNT_DISABLED"
  | "ACCOUNT_NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN";

/**
 * Rate limiting error codes
 */
export type RateLimitErrorCode = "RATE_LIMITED";

/**
 * Token-related error codes
 */
export type TokenErrorCode =
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "TOKEN_ALREADY_USED"
  | "WRONG_TOKEN_TYPE"
  | "NO_TOKEN";

/**
 * Session-related error codes
 */
export type SessionErrorCode =
  | "SESSION_ERROR"
  | "SESSION_NOT_FOUND"
  | "SESSION_EXPIRED"
  | "SESSION_REVOKED"
  | "INVALID_SESSION";

/**
 * Email-related error codes
 */
export type EmailErrorCode =
  | "EMAIL_EXISTS"
  | "EMAIL_NOT_VERIFIED"
  | "EMAIL_SEND_FAILED";

/**
 * Resource error codes
 */
export type ResourceErrorCode =
  | "NOT_FOUND"
  | "CONFLICT_ERROR"
  | "ALREADY_EXISTS";

// ============================================================================
// COMPOSED ERROR CODES (Per Feature)
// ============================================================================

/**
 * Login error codes (User)
 */
export type UserLoginErrorCode =
  | BaseErrorCode
  | AuthErrorCode
  | RateLimitErrorCode
  | SessionErrorCode
  | "EMAIL_NOT_VERIFIED";

/**
 * Login error codes (Admin - Seller)
 */
export type AdminLoginErrorCode =
  | BaseErrorCode
  | AuthErrorCode
  | RateLimitErrorCode
  | SessionErrorCode
  | "ACCOUNT_NOT_SETUP"
  | "ACCOUNT_PENDING";

/**
 * Signup error codes
 */
export type SignupErrorCode =
  | BaseErrorCode
  | RateLimitErrorCode
  | EmailErrorCode;

/**
 * Email verification error codes
 */
export type VerifyEmailErrorCode =
  | BaseErrorCode
  | TokenErrorCode
  | RateLimitErrorCode
  | "USER_NOT_FOUND"
  | "ALREADY_VERIFIED"
  | "EMAIL_SEND_FAILED";

/**
 * Password reset error codes
 */
export type PasswordResetErrorCode =
  | BaseErrorCode
  | TokenErrorCode
  | AuthErrorCode
  | "PASSWORD_SAME_AS_OLD"
  | "METHOD_NOT_ALLOWED";

/**
 * Password reset request error codes
 */
export type PasswordResetRequestErrorCode =
  | BaseErrorCode
  | RateLimitErrorCode
  | "EMAIL_SEND_FAILED";

/**
 * Account setup error codes (Seller)
 */
export type SetupErrorCode =
  | BaseErrorCode
  | TokenErrorCode
  | SessionErrorCode
  | "ACCOUNT_NOT_FOUND"
  | "ACCOUNT_ALREADY_SETUP"
  | "ACCOUNT_DISABLED";

/**
 * Magic link error codes (Mall Owner)
 */
export type MagicLinkErrorCode =
  | BaseErrorCode
  | RateLimitErrorCode
  | "IP_NOT_ALLOWED"
  | "ACCOUNT_DISABLED"
  | "EMAIL_SEND_FAILED";

/**
 * Verify login error codes (Mall Owner)
 */
export type VerifyLoginErrorCode =
  | BaseErrorCode
  | TokenErrorCode
  | AuthErrorCode
  | SessionErrorCode
  | "IP_NOT_ALLOWED"
  | "MAX_ATTEMPTS_EXCEEDED"
  | "INVALID_PASSWORD";

/**
 * Logout error codes
 */
export type LogoutErrorCode =
  | BaseErrorCode
  | TokenErrorCode
  | SessionErrorCode
  | "NOT_AUTHENTICATED";

/**
 * Token refresh error codes
 */
export type RefreshErrorCode =
  | BaseErrorCode
  | TokenErrorCode
  | SessionErrorCode
  | "NO_REFRESH_TOKEN"
  | "TOKEN_REUSE_DETECTED"
  | "ACCOUNT_DISABLED";

/**
 * Email check error codes
 */
export type EmailCheckErrorCode = BaseErrorCode | RateLimitErrorCode;

// ============================================================================
// ERROR RESPONSE TYPES
// ============================================================================

/**
 * Generic error response structure
 */
export interface ErrorResponseBody<TCode extends string = string> {
  success: false;
  error: {
    code: TCode;
    message: string;
    details?: unknown;
    field?: string;
    retryAfter?: number;
  };
}

/**
 * Generic success response structure
 */
export interface SuccessResponseBody<TData = unknown> {
  success: true;
  message?: string;
  data: TData;
}

/**
 * API response type (union of success and error)
 */
export type ApiResponseBody<TData = unknown, TCode extends string = string> =
  | SuccessResponseBody<TData>
  | ErrorResponseBody<TCode>;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if response is an error response
 */
export function isErrorResponse<TCode extends string>(
  response: ApiResponseBody<unknown, TCode>
): response is ErrorResponseBody<TCode> {
  return !response.success;
}

/**
 * Check if response is a success response
 */
export function isSuccessResponse<TData>(
  response: ApiResponseBody<TData>
): response is SuccessResponseBody<TData> {
  return response.success;
}
