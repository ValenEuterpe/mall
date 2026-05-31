import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-helper";
import prisma from "@/lib/db/prisma";
import {
  parsePaginationQuery,
  getPaginationMeta,
  paginateQuery,
} from "@/lib/utils/pagination";
import {
  buildSearchCondition,
  parseSortQuery,
  buildStableOrderBy,
} from "@/lib/utils/search";
import { paginatedResponse } from "@/lib/api/response";
import { logger } from "@/lib/utils/logger";
import { SEARCHABLE_FIELDS, SORTABLE_FIELDS, DEFAULT_SORT } from "../constants";
import { SHOP_LIST_SELECT } from "../selects";
import { parseShopFilters } from "../parsers";
import { transformShopForList } from "../transforms";
import { getSummaryStats } from "../queries/get-summary-stats";
import { buildWhereClause } from "../utils/build-where-clause";

export async function listShopsHandler(
  request: NextRequest
): Promise<NextResponse> {
  // Auth is enforced here for its side effect (throws on unauthorized);
  // the returned user object isn't needed because the handler operates on
  // mall-scoped data, not user-scoped data.
  requireAuth(request, ["MALL_OWNER"]);
  const { searchParams } = new URL(request.url);

  // Parse pagination
  const pagination = parsePaginationQuery(searchParams);

  // Parse search query - removed generic type and spread operator
  const searchQuery = searchParams.get("q") || searchParams.get("search") || "";
  const searchCondition = buildSearchCondition(searchQuery, SEARCHABLE_FIELDS, {
    minLength: 1,
  });

  // Parse filters
  const filters = parseShopFilters(searchParams);

  // Parse sort
  const sort = parseSortQuery(searchParams, SORTABLE_FIELDS, DEFAULT_SORT);

  // Build where clause - handle undefined searchCondition
  const where = buildWhereClause(filters, searchCondition || {});

  // Build orderBy
  const orderBy = buildStableOrderBy(sort);

  try {
    // Execute queries in parallel
    const [total, shops, summary] = await Promise.all([
      prisma.shop.count({ where }),
      prisma.shop.findMany({
        where,
        ...paginateQuery(pagination),
        orderBy,
        select: SHOP_LIST_SELECT,
      }),
      getSummaryStats(where),
    ]);

    // Transform shops for response
    const transformedShops = shops.map(transformShopForList);

    // Generate pagination metadata
    const meta = getPaginationMeta(pagination.page, pagination.limit, total);

    return paginatedResponse(
      transformedShops,
      {
        page: meta.page,
        limit: meta.limit,
        total: meta.total,
      },
      { summary }
    );
  } catch (error) {
    logger.error("Failed to fetch shops", { error, where, pagination });
    throw error;
  }
}
