// src/lib/api/response.ts

import { NextResponse } from "next/server";

// ============================================================================
// TYPES
// ============================================================================

export interface ApiSuccessResponse<T = unknown> {
    success: true;
    data: T;
    message?: string;
    meta?: PaginationMeta;
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

export interface ApiListResponse<T> {
    success: true;
    data: T[];
    meta: PaginationMeta;
}

// ============================================================================
// SUCCESS RESPONSES
// ============================================================================

export type ResponseHeaders = Record<string, string>;

export interface SuccessResponseOptions {
    message?: string;
    status?: number;
    headers?: ResponseHeaders;
}

/**
 * Standard success response.
 *
 * Supported call styles:
 * - successResponse(data)
 * - successResponse(data, { status, headers, message })
 * - successResponse(data, status, headers) // legacy
 */
export function successResponse<T>(
    data: T,
    options?: SuccessResponseOptions
): NextResponse<ApiSuccessResponse<T>>;
export function successResponse<T>(
    data: T,
    status?: number,
    headers?: ResponseHeaders
): NextResponse<ApiSuccessResponse<T>>;
export function successResponse<T>(
    data: T,
    arg2?: number | SuccessResponseOptions,
    arg3?: ResponseHeaders
): NextResponse<ApiSuccessResponse<T>> {
    const options: SuccessResponseOptions | undefined =
        typeof arg2 === "number" ? { status: arg2, headers: arg3 } : arg2;

    return NextResponse.json(
        {
            success: true,
            data,
            ...(options?.message && { message: options.message }),
        },
        {
            status: options?.status ?? 200,
            headers: options?.headers,
        }
    );
}

/**
 * Created response (201).
 *
 * Supported call styles:
 * - createdResponse(data)
 * - createdResponse(data, message)
 * - createdResponse(data, { message, headers })
 */
export function createdResponse<T>(
    data: T,
    message?: string
): NextResponse<ApiSuccessResponse<T>>;
export function createdResponse<T>(
    data: T,
    options?: { message?: string; headers?: ResponseHeaders }
): NextResponse<ApiSuccessResponse<T>>;
export function createdResponse<T>(
    data: T,
    arg2?: string | { message?: string; headers?: ResponseHeaders }
): NextResponse<ApiSuccessResponse<T>> {
    const options = typeof arg2 === "string" ? { message: arg2 } : arg2;

    return NextResponse.json(
        {
            success: true,
            data,
            ...(options?.message && { message: options.message }),
        },
        {
            status: 201,
            headers: options?.headers,
        }
    );
}

/**
 * No content response (204)
 */
export function noContentResponse(): NextResponse {
    return new NextResponse(null, { status: 204 });
}

/**
 * Accepted response (202) - for async operations
 */
export function acceptedResponse<T>(
    data: T,
    message: string = "Request accepted for processing"
): NextResponse<ApiSuccessResponse<T>> {
    return NextResponse.json(
        {
            success: true,
            data,
            message,
        },
        { status: 202 }
    );
}

// ============================================================================
// PAGINATED RESPONSES
// ============================================================================

/**
 * Paginated success response
 */
export function paginatedResponse<T>(
    data: T[],
    pagination: {
        page: number;
        limit: number;
        total: number;
    },
    extraMeta?: Record<string, unknown>
): NextResponse<ApiListResponse<T>> {
    const { page, limit, total } = pagination;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
        success: true,
        data,
        meta: {
            page,
            limit,
            total,
            totalPages,
            hasMore: page < totalPages,
            hasPrevious: page > 1,
            ...extraMeta,
        },
    });
}

/**
 * Build pagination meta from params
 */
export function buildPaginationMeta(
    page: number,
    limit: number,
    total: number
): PaginationMeta {
    const totalPages = Math.ceil(total / limit);
    return {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
        hasPrevious: page > 1,
    };
}

// ============================================================================
// REDIRECT RESPONSES
// ============================================================================

/**
 * Redirect response
 */
export function redirectResponse(
    url: string,
    status: 301 | 302 | 303 | 307 | 308 = 302
): NextResponse {
    return NextResponse.redirect(url, status);
}

// ============================================================================
// SPECIAL RESPONSES
// ============================================================================

/**
 * Method not allowed response (405)
 */
export function methodNotAllowed(allowedMethods: string[]): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: {
                code: "METHOD_NOT_ALLOWED",
                message: `Use ${allowedMethods.join(" or ")} method`,
            },
        },
        {
            status: 405,
            headers: { Allow: allowedMethods.join(", ") },
        }
    );
}

/**
 * Health check response
 */
export function healthResponse(
    status: "healthy" | "degraded" | "unhealthy",
    details?: Record<string, unknown>
): NextResponse {
    const statusCode =
        status === "healthy" ? 200 : status === "degraded" ? 200 : 503;

    return NextResponse.json(
        {
            success: true,
            data: {
                status,
                timestamp: new Date().toISOString(),
                ...details,
            },
        },
        { status: statusCode }
    );
}
