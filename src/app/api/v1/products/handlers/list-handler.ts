import { NextRequest, NextResponse } from "next/server";
import { optionalAuth } from "@/lib/api/auth-helper";
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

function buildFilterSqlAndParams(
  filters: {
    categoryId?: string;
    subcategoryId?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
    brand?: string;
    tagIds?: string;
  },
  startIdx: number = 1
): { sql: string; params: any[] } {
  const parts: string[] = [`p.status = 'PUBLISHED'`, `p."isActive" = true`];
  const params: any[] = [];
  let idx = startIdx;

  const ph = () => `$${idx++}`;

  if (filters.categoryId) {
    parts.push(`p."categoryId" = ${ph()}`);
    params.push(filters.categoryId);
  }
  if (filters.subcategoryId) {
    parts.push(`p."subcategoryId" = ${ph()}`);
    params.push(filters.subcategoryId);
  }
  if (filters.brand) {
    parts.push(`p.brand = ${ph()}`);
    params.push(filters.brand);
  }
  const minP = filters.minPrice !== undefined ? Number(filters.minPrice) : NaN;
  if (Number.isFinite(minP)) {
    parts.push(`p."basePrice" >= ${ph()}`);
    params.push(minP);
  }
  const maxP = filters.maxPrice !== undefined ? Number(filters.maxPrice) : NaN;
  if (Number.isFinite(maxP)) {
    parts.push(`p."basePrice" <= ${ph()}`);
    params.push(maxP);
  }
  if (filters.inStock === "true") {
    parts.push(`p."stockQuantity" > 0`);
  } else if (filters.inStock === "false") {
    parts.push(`p."stockQuantity" = 0`);
  }
  if (filters.tagIds) {
    const tagIdArray = filters.tagIds.split(",").filter(Boolean);
    if (tagIdArray.length > 0) {
      parts.push(
        `EXISTS (SELECT 1 FROM "product_tags" pt WHERE pt."productId" = p.id AND pt."tagId" = ANY(${ph()}))`
      );
      params.push(tagIdArray);
    }
  }

  return { sql: parts.join(" AND "), params };
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

  // Expand tagIds along the canonical chain (one hop): a query for a canonical tag
  // should also match products tagged with its synonyms, and vice versa.
  if (filters.tagIds) {
    const requested = filters.tagIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (requested.length > 0) {
      const synonymRows = await prisma.tag.findMany({
        where: {
          OR: [
            { canonicalTagId: { in: requested } },
            { id: { in: requested } },
          ],
        },
        select: { id: true, canonicalTagId: true },
      });
      const expanded = new Set<string>(requested);
      for (const row of synonymRows) {
        expanded.add(row.id);
        if (row.canonicalTagId) expanded.add(row.canonicalTagId);
      }
      filters.tagIds = [...expanded].join(",");
    }
  }

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
    let products: any[] = [];
    let total = 0;

    if (searchQuery.trim().length >= 2) {
      const q = searchQuery.trim().toLowerCase();
      const tokenizedQ = q.split(/\s+/).filter((w) => w.length >= 2);
      const prefix = `${q}%`;

      const { sql: filterSql, params: filterParams } = buildFilterSqlAndParams(
        filters,
        4
      ); // Start at $4 since $1=$tokenizedQ, $2=$q, $3=$prefix

      const searchSql = `
                p."searchTokens" && $1::text[]
                OR p.name_en ILIKE $3
                OR p.name_ru ILIKE $3
                OR p.name_am ILIKE $3
                OR EXISTS (SELECT 1 FROM unnest(p."searchTokens") AS token WHERE token ILIKE $3)
                OR p.name_en % $2
                OR p.name_ru % $2
                OR p.name_am % $2
                OR EXISTS (
                    SELECT 1 FROM "product_tags" pt
                    JOIN "tags" t ON t.id = pt."tagId"
                    WHERE pt."productId" = p.id
                      AND (t.name_en % $2 OR t.name_ru % $2 OR t.name_am % $2 OR t.transliteration % $2)
                )
            `;

      const countResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM products p WHERE ${filterSql} AND (${searchSql})`,
        tokenizedQ,
        q,
        prefix,
        ...filterParams
      );
      total = Number(countResult[0]?.count ?? 0);

      if (total > 0) {
        const offset = (pagination.page - 1) * pagination.limit;
        const limitIdx = 4 + filterParams.length;
        const offsetIdx = limitIdx + 1;

        const rows = await prisma.$queryRawUnsafe<
          { id: string; score: number }[]
        >(
          `SELECT p.id,
                            GREATEST(
                              CASE WHEN p.name_en ILIKE $3 THEN 1 ELSE 0 END,
                              CASE WHEN p.name_ru ILIKE $3 THEN 1 ELSE 0 END,
                              CASE WHEN p.name_am ILIKE $3 THEN 1 ELSE 0 END,
                              CASE WHEN EXISTS (SELECT 1 FROM unnest(p."searchTokens") AS token WHERE token ILIKE $3) THEN 1 ELSE 0 END,
                              similarity(p.name_en, $2),
                              similarity(p.name_ru, $2),
                              similarity(p.name_am, $2),
                              COALESCE((
                                SELECT MAX(similarity(t.transliteration, $2))
                                FROM "product_tags" pt
                                JOIN "tags" t ON t.id = pt."tagId"
                                WHERE pt."productId" = p.id
                              ), 0)
                            ) AS score
                     FROM products p
                     WHERE ${filterSql} AND (${searchSql})
                     ORDER BY score DESC NULLS LAST, p."createdAt" DESC
                     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
          tokenizedQ,
          q,
          prefix,
          ...filterParams,
          pagination.limit,
          offset
        );

        const ids = rows.map((r) => r.id);
        if (ids.length > 0) {
          const hydrated = await prisma.product.findMany({
            where: { id: { in: ids }, status: "PUBLISHED", isActive: true },
            select: getProductListSelect(),
          });
          const productMap = new Map(hydrated.map((p) => [p.id, p]));
          products = ids.map((id) => productMap.get(id)).filter(Boolean);
        }
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
      transformProductForList(product, locale)
    );

    const meta = getPaginationMeta(pagination.page, pagination.limit, total);

    const response = paginatedResponse(transformedProducts, {
      page: meta.page,
      limit: meta.limit,
      total: meta.total,
    });

    logProductSearch(searchQuery, filters, total, user?.userId).catch(() => {});

    return response;
  } catch (error) {
    logger.error("Failed to fetch products", { error, where, pagination });
    throw error;
  }
}
