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
import { z } from "zod";
import { Prisma, ProductStatus } from "@/prisma/generated/client";

import { getSellerShop } from "../queries/get-seller-shop";
import { getProductSummary } from "../queries/get-product-summary";
import { PRODUCT_LIST_SELECT } from "../selects";
import { transformProductForSeller } from "../transforms";
import { SEARCHABLE_FIELDS, SORTABLE_FIELDS, DEFAULT_SORT } from "../constants";

const statusFilterSchema = z
  .enum(["DRAFT", "PUBLISHED", "ARCHIVED"])
  .optional();

function parseStatusFilter(value: string | null): ProductStatus | undefined {
  if (!value) return undefined;
  const result = statusFilterSchema.safeParse(value.toUpperCase());
  return result.success ? (result.data as ProductStatus) : undefined;
}

export async function listProductsHandler(
  request: NextRequest
): Promise<NextResponse> {
  const user = requireAuth(request, ["SELLER"]);
  const { searchParams } = new URL(request.url);

  const shop = await getSellerShop(user.userId);
  const pagination = parsePaginationQuery(searchParams);

  const searchQuery = searchParams.get("q") || searchParams.get("search") || "";
  const searchCondition = buildSearchCondition(searchQuery, SEARCHABLE_FIELDS, {
    minLength: 1,
  });

  const status = parseStatusFilter(searchParams.get("status"));

  const isActive = searchParams.get("isActive");
  const categoryId = searchParams.get("categoryId");
  const lowStock = searchParams.get("lowStock");
  const lowStockThreshold = parseInt(
    searchParams.get("lowStockThreshold") || "10"
  );

  const sort = parseSortQuery(searchParams, SORTABLE_FIELDS, DEFAULT_SORT);

  const where: Prisma.ProductWhereInput = {
    shopId: shop.id,
    ...(searchCondition || {}),
  };

  if (status) where.status = status;
  if (isActive === "true") where.isActive = true;
  else if (isActive === "false") where.isActive = false;
  if (categoryId) where.categoryId = categoryId;
  if (lowStock === "true") where.stockQuantity = { lte: lowStockThreshold };

  const orderBy = buildStableOrderBy(sort);

  try {
    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        ...paginateQuery(pagination),
        orderBy,
        select: PRODUCT_LIST_SELECT,
      }),
    ]);

    const transformedProducts = products.map(transformProductForSeller);
    const meta = getPaginationMeta(pagination.page, pagination.limit, total);
    const summary = await getProductSummary(shop.id);

    // Updated to match paginatedResponse signature
    return paginatedResponse(transformedProducts, meta, { summary });
  } catch (error) {
    logger.error("Failed to fetch seller products", {
      sellerId: user.userId,
      shopId: shop.id,
      error,
    });
    throw error;
  }
}
