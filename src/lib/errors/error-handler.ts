// src/lib/errors/error-handler.ts

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, RateLimitError, isAppError } from "./custom-errors";
import { logger } from "@/lib/utils/logger";
import type { Prisma } from "@/prisma/generated/client";

// ============================================================================
// TYPES
// ============================================================================

export interface ErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}

interface ErrorContext {
    path?: string;
    method?: string;
    userId?: string;
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

/**
 * Global error handler for API routes
 */
export function handleError(
    error: unknown,
    context?: ErrorContext
): NextResponse<ErrorResponse> {
    // Log error with context
    logger.error("API Error:", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        ...context,
    });

    // Handle AppError (our custom errors)
    if (isAppError(error)) {
        const headers: Record<string, string> = {};

        // Add Retry-After header for rate limit errors
        if (error instanceof RateLimitError && error.retryAfter) {
            headers["Retry-After"] = String(error.retryAfter);
        }

        return NextResponse.json(
            {
                success: false,
                error: error.toJSON(),
            },
            { status: error.statusCode, headers }
        );
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
        }));

        return NextResponse.json(
            {
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid input data",
                    details: formattedErrors,
                },
            },
            { status: 400 }
        );
    }

    // Handle Prisma errors
    if (error && typeof error === "object") {
        const errorObj = error as any;
        if (errorObj.code && errorObj.meta !== undefined) {
            // This is likely a PrismaClientKnownRequestError
            return handlePrismaError(errorObj);
        }
        if (errorObj.constructor?.name === "PrismaClientInitializationError") {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: "DATABASE_CONNECTION_ERROR",
                        message: "Unable to connect to database",
                    },
                },
                { status: 503 }
            );
        }
    }

    // Handle unknown errors
    const message =
        process.env.NODE_ENV === "production"
            ? "An unexpected error occurred"
            : error instanceof Error
                ? error.message
                : "Unknown error";

    return NextResponse.json(
        {
            success: false,
            error: {
                code: "INTERNAL_ERROR",
                message,
            },
        },
        { status: 500 }
    );
}

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(
    error: any
): NextResponse<ErrorResponse> {
    const prismaErrors: Record<
        string,
        { status: number; code: string; message: string }
    > = {
        P2002: {
            status: 409,
            code: "CONFLICT_ERROR",
            message: "A record with this value already exists",
        },
        P2025: {
            status: 404,
            code: "NOT_FOUND",
            message: "Record not found",
        },
        P2003: {
            status: 400,
            code: "FOREIGN_KEY_ERROR",
            message: "Related record does not exist",
        },
        P2014: {
            status: 400,
            code: "RELATION_ERROR",
            message: "Required relation violation",
        },
        P2021: {
            status: 500,
            code: "DATABASE_ERROR",
            message: "Table does not exist",
        },
        P2022: {
            status: 500,
            code: "DATABASE_ERROR",
            message: "Column does not exist",
        },
    };

    const errorInfo = prismaErrors[error.code] ?? {
        status: 500,
        code: "DATABASE_ERROR",
        message: "Database operation failed",
    };

    return NextResponse.json(
        {
            success: false,
            error: {
                code: errorInfo.code,
                message: errorInfo.message,
                ...(process.env.NODE_ENV === "development" && {
                    details: error.meta,
                }),
            },
        },
        { status: errorInfo.status }
    );
}

// ============================================================================
// ASYNC HANDLER WRAPPER
// ============================================================================

type RouteHandler<T = unknown> = (
    request: NextRequest,
    context?: { params: Promise<T> }
) => Promise<NextResponse>;

/**
 * Async error wrapper for API routes
 * Automatically catches errors and returns proper error responses
 *
 * @example
 * ```ts
 * export const GET = asyncHandler(async (request) => {
 *   // Your logic here - errors are automatically caught
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function asyncHandler<T = unknown>(
    handler: RouteHandler<T>
): RouteHandler<T> {
    return async (request, context) => {
        try {
            return await handler(request, context);
        } catch (error) {
            return handleError(error, {
                path: request.nextUrl.pathname,
                method: request.method,
            });
        }
    };
}

/**
 * Create an error response directly (for manual error handling)
 */
export function createError(
    code: string,
    message: string,
    status: number,
    details?: unknown
): NextResponse<ErrorResponse> {
    return NextResponse.json(
        {
            success: false,
            error: {
                code,
                message,
                ...(details && process.env.NODE_ENV === "development"
                    ? { details }
                    : {}),
            },
        },
        { status }
    );
}