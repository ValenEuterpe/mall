import { paginationSchema } from "./schemas";
import { PAGINATION_DEFAULTS } from "./constants";
import {
    PaginationParams,
    PaginationMeta,
    PrismaPageParams,
} from "./types";

/**
 * Calculates the offset for pagination.
 *
 * @param page - Current page number (1-indexed)
 * @param limit - Items per page
 * @returns Offset value for database query
 */
export function getPaginationOffset(page: number, limit: number): number {
    const validPage = Math.max(1, Math.floor(page));
    const validLimit = Math.max(1, Math.floor(limit));
    return (validPage - 1) * validLimit;
}

/**
 * Generates pagination metadata from query results.
 *
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Pagination metadata object
 */
export function getPaginationMeta(
    page: number,
    limit: number,
    total: number
): PaginationMeta {
    const validPage = Math.max(1, Math.floor(page));
    const validLimit = Math.max(1, Math.floor(limit));
    const validTotal = Math.max(0, Math.floor(total));

    const totalPages = validLimit > 0 ? Math.ceil(validTotal / validLimit) : 0;

    return {
        page: validPage,
        limit: validLimit,
        total: validTotal,
        totalPages,
        hasNextPage: validPage < totalPages,
        hasPreviousPage: validPage > 1,
    };
}

/**
 * Generates Prisma-compatible pagination parameters.
 *
 * @param params - Pagination parameters
 * @returns Object with skip and take values for Prisma
 */
export function paginateQuery(params: PaginationParams): PrismaPageParams {
    return {
        skip: getPaginationOffset(params.page, params.limit),
        take: params.limit,
    };
}

/**
 * Parses pagination parameters from URL search params with validation.
 *
 * @param searchParams - URL search parameters
 * @param defaults - Optional custom defaults
 * @returns Validated pagination parameters
 */
export function parsePaginationQuery(
    searchParams: URLSearchParams,
    defaults?: Partial<PaginationParams>
): PaginationParams {
    const raw = {
        page: searchParams.get("page") ?? defaults?.page ?? PAGINATION_DEFAULTS.PAGE,
        limit: searchParams.get("limit") ?? defaults?.limit ?? PAGINATION_DEFAULTS.LIMIT,
    };

    const result = paginationSchema.safeParse(raw);

    if (!result.success) {
        // Return safe defaults on validation failure
        return {
            page: defaults?.page ?? PAGINATION_DEFAULTS.PAGE,
            limit: defaults?.limit ?? PAGINATION_DEFAULTS.LIMIT,
        };
    }

    return result.data;
}