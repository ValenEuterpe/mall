// src/lib/api/responses.ts
import { NextResponse } from "next/server";

/**
 * Generic error response structure
 */
export interface ApiErrorResponse<TCode extends string = string> {
  success: false;
  error: {
    code: TCode;
    message: string;
    details?: unknown;
    field?: string;
  };
}

/**
 * Generic success response structure
 */
export interface ApiSuccessResponse<TData = unknown> {
  success: true;
  data: TData;
  message?: string;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse<TCode extends string>(
  code: TCode,
  message: string,
  status: number,
  options?: {
    details?: unknown;
    field?: string;
    headers?: Record<string, string>;
  }
): NextResponse<ApiErrorResponse<TCode>> {
  const showDetails =
    process.env.NODE_ENV === "development" && options?.details;

  return NextResponse.json(
    {
      success: false as const,
      error: {
        code,
        message,
        ...(showDetails ? { details: options.details } : {}),
        ...(options?.field ? { field: options.field } : {}),
      },
    },
    {
      status,
      headers: options?.headers,
    }
  );
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<TData>(
  data: TData,
  options?: {
    message?: string;
    status?: number;
    headers?: Record<string, string>;
  }
): NextResponse<ApiSuccessResponse<TData>> {
  return NextResponse.json(
    {
      success: true as const,
      data,
      ...(options?.message ? { message: options.message } : {}),
    },
    {
      status: options?.status ?? 200,
      headers: options?.headers,
    }
  );
}

/**
 * Method not allowed response helper
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
