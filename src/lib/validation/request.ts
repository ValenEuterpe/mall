// src/lib/validation/request.ts

import { NextRequest } from "next/server";
import { z, ZodSchema, ZodError } from "zod";
import { ValidationError } from "@/lib/errors/custom-errors";

// ============================================================================
// TYPES
// ============================================================================

export type ValidationResult<T> =
    | {
        success: true;
        data: T;
    }
    | {
        success: false;
        error: ValidationError;
    };

export interface PaginationParams {
    page: number;
    limit: number;
    offset: number;
}

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * Common pagination schema
 */
export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Common sort schema
 */
export const sortSchema = z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * UUID parameter schema
 */
export const uuidParamSchema = z.object({
    id: z.string().cuid(),
});

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate request body against Zod schema
 * 
 * @throws ValidationError if validation fails
 * 
 * @example
 * ```ts
 * const data = await validateBody(request, createUserSchema);
 * ```
 */
export async function validateBody<T>(
    request: NextRequest,
    schema: ZodSchema<T>
): Promise<T> {
    try {
        const body = await request.json();
        return schema.parse(body);
    } catch (error) {
        if (error instanceof ZodError) {
            const formattedErrors = error.issues.map((err) => ({
                field: err.path.join("."),
                message: err.message,
                code: err.code,
            }));
            throw new ValidationError("Invalid request body", formattedErrors);
        }

        if (error instanceof SyntaxError) {
            throw new ValidationError("Invalid JSON in request body");
        }

        throw error;
    }
}

/**
 * Validate request body without throwing (returns result object)
 */
export async function safeValidateBody<T>(
    request: NextRequest,
    schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
    try {
        const data = await validateBody(request, schema);
        return { success: true, data };
    } catch (error) {
        if (error instanceof ValidationError) {
            return { success: false, error };
        }
        throw error;
    }
}

/**
 * Validate query parameters against Zod schema
 * 
 * @throws ValidationError if validation fails
 * 
 * @example
 * ```ts
 * const { page, limit } = validateQuery(request, paginationSchema);
 * ```
 */
export function validateQuery<T>(
    request: NextRequest,
    schema: ZodSchema<T>
): T {
    const { searchParams } = new URL(request.url);
    const query: Record<string, string | string[]> = {};

    searchParams.forEach((value, key) => {
        const existing = query[key];
        if (existing) {
            // Handle multiple values for same key
            query[key] = Array.isArray(existing)
                ? [...existing, value]
                : [existing, value];
        } else {
            query[key] = value;
        }
    });

    try {
        return schema.parse(query);
    } catch (error) {
        if (error instanceof ZodError) {
            const formattedErrors = error.issues.map((err) => ({
                field: err.path.join("."),
                message: err.message,
                code: err.code,
            }));
            throw new ValidationError("Invalid query parameters", formattedErrors);
        }
        throw error;
    }
}

/**
 * Validate route params against Zod schema
 * 
 * @throws ValidationError if validation fails
 * 
 * @example
 * ```ts
 * const { id } = await validateParams(params, uuidParamSchema);
 * ```
 */
export async function validateParams<T>(
    params: Promise<Record<string, string>> | Record<string, string>,
    schema: ZodSchema<T>
): Promise<T> {
    const resolvedParams = params instanceof Promise ? await params : params;

    try {
        return schema.parse(resolvedParams);
    } catch (error) {
        if (error instanceof ZodError) {
            const formattedErrors = error.issues.map((err) => ({
                field: err.path.join("."),
                message: err.message,
                code: err.code,
            }));
            throw new ValidationError("Invalid route parameters", formattedErrors);
        }
        throw error;
    }
}

/**
 * Parse pagination from query params
 */
export function parsePagination(request: NextRequest): PaginationParams {
    const { page, limit } = validateQuery(request, paginationSchema);
    const offset = (page - 1) * limit;

    return { page, limit, offset };
}

/**
 * Validate file upload
 */
export function validateFile(
    file: File,
    options: {
        maxSize?: number; // in bytes
        allowedTypes?: string[];
    } = {}
): void {
    const { maxSize = 5 * 1024 * 1024, allowedTypes } = options; // Default 5MB

    if (file.size > maxSize) {
        throw new ValidationError(
            `File size exceeds maximum of ${Math.round(maxSize / 1024 / 1024)}MB`
        );
    }

    if (allowedTypes && !allowedTypes.includes(file.type)) {
        throw new ValidationError(
            `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(", ")}`
        );
    }
}