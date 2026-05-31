import { cursorPaginationSchema } from "./schemas";
import { PAGINATION_DEFAULTS } from "./constants";
import {
  CursorPaginationParams,
  PrismaCursorParams,
  CursorPaginationMeta,
} from "./types";

/**
 * Generates Prisma-compatible cursor pagination parameters.
 *
 * @param params - Cursor pagination parameters
 * @returns Object for Prisma cursor pagination
 */
export function cursorPaginateQuery(
  params: CursorPaginationParams
): PrismaCursorParams {
  const result: PrismaCursorParams = {
    take: params.direction === "backward" ? -params.limit : params.limit,
  };

  if (params.cursor) {
    result.cursor = { id: params.cursor };
    result.skip = 1; // Skip the cursor item itself
  }

  return result;
}

/**
 * Generates cursor pagination metadata.
 *
 * @param items - Retrieved items
 * @param limit - Requested limit
 * @param hasMore - Whether more items exist
 * @param total - Optional total count
 * @returns Cursor pagination metadata
 */
export function getCursorPaginationMeta<T extends { id: string }>(
  items: T[],
  limit: number,
  hasMore: boolean,
  total?: number
): CursorPaginationMeta {
  return {
    limit,
    hasNextPage: hasMore,
    hasPreviousPage: items.length > 0 && items[0] !== undefined,
    startCursor: items.length > 0 ? items[0].id : null,
    endCursor: items.length > 0 ? items[items.length - 1].id : null,
    ...(total !== undefined && { total }),
  };
}

/**
 * Parses cursor pagination from URL search params.
 *
 * @param searchParams - URL search parameters
 * @returns Validated cursor pagination parameters
 */
export function parseCursorPaginationQuery(
  searchParams: URLSearchParams
): CursorPaginationParams {
  const raw = {
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? PAGINATION_DEFAULTS.LIMIT,
    direction: searchParams.get("direction") ?? "forward",
  };

  const result = cursorPaginationSchema.safeParse(raw);

  if (!result.success) {
    return {
      limit: PAGINATION_DEFAULTS.LIMIT,
      direction: "forward",
    };
  }

  return result.data;
}
