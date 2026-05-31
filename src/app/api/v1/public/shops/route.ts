import { NextRequest, NextResponse } from "next/server";

import { withMiddleware } from "@/lib/api/middleware";
import prisma from "@/lib/db/prisma";
import {
  parsePaginationQuery,
  getPaginationMeta,
  paginateQuery,
  PAGINATION_DEFAULTS,
} from "@/lib/utils/pagination";
import {
  buildSearchCondition,
  parseSortQuery,
  buildStableOrderBy,
  combineFilters,
} from "@/lib/utils/search";
import { paginatedResponse } from "@/lib/api/response";
import { Prisma } from "@/prisma/generated/client";
import { logger } from "@/lib/utils/logger";
import { shopListQuerySchema } from "./schemas";

const SEARCHABLE_FIELDS = ["shopName", "fullCode", "description"] as const;

const SORTABLE_FIELDS = [
  "shopName",
  "fullCode",
  "createdAt",
  "venue",
  "building",
  "floor",
] as const;

const DEFAULT_SORT = {
  field: "shopName",
  order: "asc" as const,
};

const SHOP_LIST_SELECT = {
  id: true,
  fullCode: true,
  shopName: true,
  description: true,
  imageUrl: true,
  venue: true,
  building: true,
  floor: true,
  svgId: true,
  openingHours: true,
  shopType: {
    select: {
      id: true,
      key: true,
      name_en: true,
      name_ru: true,
      name_am: true,
      icon: true,
      color: true,
    },
  },
  contacts: {
    select: {
      id: true,
      type: true,
      value: true,
      label: true,
    },
  },
  seller: {
    select: {
      id: true,
      businessName: true,
      logoUrl: true,
      isVerified: true,
    },
  },
  _count: {
    select: {
      products: {
        where: {
          status: "PUBLISHED",
          isActive: true,
        },
      },
    },
  },
} satisfies Prisma.ShopSelect;

type ShopRaw = Prisma.ShopGetPayload<{ select: typeof SHOP_LIST_SELECT }>;

function transformShopForList(shop: ShopRaw) {
  return {
    id: shop.id,
    fullCode: shop.fullCode,
    shopName: shop.shopName,
    description: shop.description,
    imageUrl: shop.imageUrl,
    venue: shop.venue,
    building: shop.building,
    floor: shop.floor,
    svgId: shop.svgId,
    openingHours: shop.openingHours,
    shopType: shop.shopType,
    contacts: shop.contacts,
    seller: shop.seller,
    productCount: shop._count.products,
  };
}

async function getShopsHandler(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const parsed = shopListQuerySchema.safeParse(
    Object.fromEntries(searchParams)
  );
  if (!parsed.success) {
    // Fall through with defaults — non-critical validation
  }

  const pagination = parsePaginationQuery(searchParams, {
    limit: PAGINATION_DEFAULTS.LIMIT,
  });

  const searchQuery = searchParams.get("q") || searchParams.get("search") || "";
  const searchCondition = buildSearchCondition(searchQuery, SEARCHABLE_FIELDS, {
    minLength: 1,
  });

  const sort = parseSortQuery(searchParams, SORTABLE_FIELDS, DEFAULT_SORT);

  const baseWhere: Prisma.ShopWhereInput = {
    isActive: true,
    sellerId: { not: null },
  };

  const filterConditions: Prisma.ShopWhereInput = {};
  const venue = searchParams.get("venue");
  const building = searchParams.get("building");
  const floor = searchParams.get("floor");

  if (venue) filterConditions.venue = venue;
  if (building) filterConditions.building = building;
  if (floor) filterConditions.floor = floor;

  const where: Prisma.ShopWhereInput = combineFilters(
    baseWhere,
    searchCondition || {},
    filterConditions
  );

  const orderBy = buildStableOrderBy(sort);

  try {
    const [total, shops] = await Promise.all([
      prisma.shop.count({ where }),
      prisma.shop.findMany({
        where,
        ...paginateQuery(pagination),
        orderBy,
        select: SHOP_LIST_SELECT,
      }),
    ]);

    const transformedShops = shops.map(transformShopForList);

    const meta = getPaginationMeta(pagination.page, pagination.limit, total);

    return paginatedResponse(transformedShops, {
      page: meta.page,
      limit: meta.limit,
      total: meta.total,
    });
  } catch (error) {
    logger.error("Failed to fetch shops", { error, where, pagination });
    throw error;
  }
}

export const GET = withMiddleware(getShopsHandler, {
  requireAuth: false,
  rateLimit: true,
});
