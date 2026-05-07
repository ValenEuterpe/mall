// src/lib/errors/index.ts
// Barrel export for error utilities

// Custom error classes
export {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    DatabaseError,
    StorageError,
    ServiceUnavailableError,
    isAppError,
    isOperationalError,
} from "./custom-errors";

// Error handler utilities
export {
    handleError,
    asyncHandler,
    createError,
    type ErrorResponse,
} from "./error-handler";
