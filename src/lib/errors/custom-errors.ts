// src/lib/errors/custom-errors.ts

/**
 * Base application error class
 * All custom errors should extend this
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR",
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // Distinguish from programming errors
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serialize error for JSON response
   */
  toJSON(): {
    code: string;
    message: string;
    details?: unknown;
  } {
    return {
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

/**
 * 400 - Validation Error
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

/**
 * 401 - Authentication Error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

/**
 * 403 - Authorization Error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(message, 403, "AUTHORIZATION_ERROR");
  }
}

/**
 * 403 - Forbidden Error
 */
export class ForbiddenError extends AppError {
  constructor(
    message: string = "Access denied: You do not have the required permissions"
  ) {
    super(message, 403, "FORBIDDEN_ERROR");
  }
}

/**
 * 404 - Not Found Error
 */
export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

/**
 * 409 - Conflict Error
 */
export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists") {
    super(message, 409, "CONFLICT_ERROR");
  }
}

/**
 * 429 - Rate Limit Error
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string = "Too many requests", retryAfter?: number) {
    super(message, 429, "RATE_LIMIT_ERROR");
    this.retryAfter = retryAfter;
  }
}

/**
 * 500 - Database Error
 */
export class DatabaseError extends AppError {
  constructor(
    message: string = "Database operation failed",
    details?: unknown
  ) {
    super(message, 500, "DATABASE_ERROR", details);
  }
}

/**
 * 500 - Storage Error (S3, Cloudinary, Local Disk, etc.)
 */
export class StorageError extends AppError {
  constructor(message: string = "Storage operation failed", details?: unknown) {
    super(message, 500, "STORAGE_ERROR", details);
  }
}

/**
 * 503 - Service Unavailable Error
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = "Service temporarily unavailable") {
    super(message, 503, "SERVICE_UNAVAILABLE");
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if error is operational (expected)
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}
