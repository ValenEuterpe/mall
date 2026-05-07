import { NextRequest } from "next/server";
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
import { Prisma } from "@/prisma/generated/client";
import { logger } from "@/lib/utils/logger";

import { SEARCHABLE_FIELDS, SORTABLE_FIELDS, DEFAULT_SORT } from "../constants";
import { SELLER_LIST_SELECT } from "../selects";
import { parseSellerFilters } from "../parsers";
import { buildWhereClause } from "../utils/build-where-clause";
import { transformSellerForList } from "../transforms/transform-seller-for-list";
import { getSellerSummary } from "../queries/get-seller-summary";

export async function listSellersHandler(
  request: NextRequest
): Promise<import("next/server").NextResponse> {
  requireAuth(request, ["MALL_OWNER"]);
  const { searchParams } = new URL(request.url);

  const pagination = parsePaginationQuery(searchParams);

  const searchQuery = searchParams.get("q") || searchParams.get("search") || "";
  const rawSearchCondition = buildSearchCondition(
    searchQuery,
    SEARCHABLE_FIELDS,
    { minLength: 1 }
  );

  // `buildSearchCondition` returns `{ OR: [...] }` over the provided field names.
  // Prisma `SellerWhereInput` can accept the same shape, so we cast safely.
  const searchCondition = (rawSearchCondition ?? undefined) as
    | Prisma.SellerWhereInput
    | undefined;

  const filters = parseSellerFilters(searchParams);
  const sort = parseSortQuery(searchParams, SORTABLE_FIELDS, DEFAULT_SORT);

  const where = buildWhereClause(filters, searchCondition ?? {});
  const orderBy = buildStableOrderBy(sort);

  try {
    const [total, sellers, summary] = await Promise.all([
      prisma.seller.count({ where }),
      prisma.seller.findMany({
        where,
        ...paginateQuery(pagination),
        orderBy,
        select: SELLER_LIST_SELECT,
      }),
      getSellerSummary(),
    ]);

    const transformedSellers = sellers.map(transformSellerForList);
    const meta = getPaginationMeta(pagination.page, pagination.limit, total);

    return paginatedResponse(
      transformedSellers,
      { page: meta.page, limit: meta.limit, total: meta.total },
      { summary }
    );
  } catch (error) {
    logger.error("Failed to fetch sellers", { error, where, pagination });
    throw error;
  }
}
