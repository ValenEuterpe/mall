import { NextRequest, NextResponse } from "next/server";
import {
  optionalAuth,
  extractAccessToken,
  extractRefreshToken,
} from "@/lib/api/auth-helper";
import prisma from "@/lib/db/prisma";
import {
  parsePaginationQuery,
  getPaginationMeta,
  paginateQuery,
  PAGINATION_DEFAULTS,
} from "@/lib/utils/pagination";
import {
  parseSortQuery,
  buildStableOrderBy,
  combineFilters,
} from "@/lib/utils/search";
import { paginatedResponse } from "@/lib/api/response";
import { Prisma } from "@/prisma/generated/client";
import { logger } from "@/lib/utils/logger";
import { SORTABLE_FIELDS, DEFAULT_SORT } from "../helpers/constants";
import { getProductListSelect } from "../helpers/selects";
import { parseProductFilters, buildFilterConditions } from "../helpers/filters";
import { transformProductForList } from "../helpers/transform";
import { logProductSearch } from "../helpers/utils";
import { parseLocale } from "@/lib/i18n/locale";
import {
  buildFilterSqlAndParams,
  buildSearchBaseParams,
  buildSearchJoinSql,
  buildSearchMatchSql,
  buildSearchScoreSql,
  getSearchSqlPlaceholders,
  shouldUseTrigram,
} from "../helpers/search-sql";
import { expandTagIdsWithSynonyms } from "../helpers/search-tags";

const PUBLIC_SEARCH_CACHE =
  "public, max-age=10, stale-while-revalidate=30";

function hasAuthCredentials(request: NextRequest): boolean {
  return !!(extractAccessToken(request) || extractRefreshToken(request));
}

export async function getProductsHandler(
  request: NextRequest
): Promise<NextResponse> {
  const user = optionalAuth(request);
  const { searchParams } = new URL(request.url);
  const locale = parseLocale(searchParams.get("locale"));

  const pagination = parsePaginationQuery(searchParams, {
    limit: PAGINATION_DEFAULTS.LIMIT,
  });

  const searchQuery = searchParams.get("q") || searchParams.get("search") || "";
  const filters = parseProductFilters(searchParams);
  const sort = parseSortQuery(searchParams, SORTABLE_FIELDS, DEFAULT_SORT);

  filters.tagIds = await expandTagIdsWithSynonyms(filters.tagIds);

  const baseWhere: Prisma.ProductWhereInput = {
    status: "PUBLISHED",
    isActive: true,
  };
  const filterConditions = buildFilterConditions(filters);
  const where: Prisma.ProductWhereInput = combineFilters(
    baseWhere,
    {},
    filterConditions
  );
  const orderBy = buildStableOrderBy(sort);

  try {
    let products: unknown[] = [];
    let total = 0;

    if (searchQuery.trim().length >= 2) {
      const q = searchQuery.trim().toLowerCase();
      const tokenizedQ = q.split(/\s+/).filter((w) => w.length >= 2);
      const prefix = `${q}%`;
      const useTrigram = shouldUseTrigram(q);
      const ph = getSearchSqlPlaceholders(useTrigram);

      const { sql: filterSql, params: filterParams } = buildFilterSqlAndParams(
        filters,
        ph.filterStartIdx
      );

      const searchSql = buildSearchMatchSql(ph);
      const scoreSql = buildSearchScoreSql(ph);
      const offset = (pagination.page - 1) * pagination.limit;
      const limitIdx = ph.filterStartIdx + filterParams.length;
      const offsetIdx = limitIdx + 1;

      const rows = await prisma.$queryRawUnsafe<
        { id: string; score: number; total_count: bigint }[]
      >(
        `SELECT p.id,
                (${scoreSql}) AS score,
                COUNT(*) OVER()::bigint AS total_count
         FROM products p
         ${buildSearchJoinSql()}
         WHERE ${filterSql} AND (${searchSql})
         ORDER BY score DESC NULLS LAST, p."createdAt" DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        ...buildSearchBaseParams(tokenizedQ, q, prefix, useTrigram),
        ...filterParams,
        pagination.limit,
        offset
      );

      total = Number(rows[0]?.total_count ?? 0);

      if (rows.length > 0) {
        const ids = rows.map((r) => r.id);
        const hydrated = await prisma.product.findMany({
          where: { id: { in: ids }, status: "PUBLISHED", isActive: true },
          select: getProductListSelect(),
        });
        const productMap = new Map(hydrated.map((p) => [p.id, p]));
        products = ids.map((id) => productMap.get(id)).filter(Boolean);
      }
    } else {
      [total, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          ...paginateQuery(pagination),
          orderBy,
          select: getProductListSelect(),
        }),
      ]);
    }

    const transformedProducts = products.map((product) =>
      transformProductForList(product as Parameters<typeof transformProductForList>[0], locale)
    );

    const meta = getPaginationMeta(pagination.page, pagination.limit, total);

    const response = paginatedResponse(transformedProducts, {
      page: meta.page,
      limit: meta.limit,
      total: meta.total,
    });

    if (!user && !hasAuthCredentials(request)) {
      response.headers.set("Cache-Control", PUBLIC_SEARCH_CACHE);
    }

    logProductSearch(searchQuery, filters, total, user?.userId).catch(() => {});

    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : String(error);
    logger.error("Failed to fetch products", {
      message,
      where,
      pagination,
      searchQuery,
      ...(process.env.NODE_ENV === "development" && { error }),
    });
    throw error;
  }
}
