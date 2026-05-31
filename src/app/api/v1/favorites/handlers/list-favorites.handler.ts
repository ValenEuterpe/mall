import { NextRequest, NextResponse } from "next/server";

import { createSuccessResponse } from "@/app/response";
import prisma from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/types/auth";
import { FAVORITE_WITH_PRODUCT } from "../selects";
import {
  parsePaginationQuery,
  getPaginationMeta,
  paginateQuery,
} from "@/lib/utils/pagination";

export async function GET(
  request: NextRequest,
  { user }: { params: Promise<unknown>; user: AuthenticatedUser }
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const pagination = parsePaginationQuery(searchParams, {
    limit: 20,
  });

  const [total, rawFavorites] = await Promise.all([
    prisma.favorite.count({
      where: {
        ownerId: user.userId,
        product: {
          isActive: true,
          status: "PUBLISHED",
        },
      },
    }),
    prisma.favorite.findMany({
      where: {
        ownerId: user.userId,
        product: {
          isActive: true,
          status: "PUBLISHED",
        },
      },
      select: FAVORITE_WITH_PRODUCT,
      orderBy: { createdAt: "desc" },
      ...paginateQuery(pagination),
    }),
  ]);

  const favorites = rawFavorites as unknown as Array<{
    id: string;
    productId: string;
    createdAt: Date;
    product: {
      id: string;
      name: string;
      name_en: string | null;
      name_ru: string | null;
      name_am: string | null;
      description: string | null;
      basePrice: { toNumber: () => number };
      stockQuantity: number;
      images: string[];
      brand: string | null;
      sku: string | null;
      status: string;
      isActive: boolean;
      shop: {
        id: string;
        fullCode: string;
        shopName: string | null;
        venue: string | null;
        building: string | null;
        floor: string | null;
      };
      category: {
        id: string;
        name_en: string | null;
        name_ru: string | null;
        name_am: string | null;
      } | null;
    };
  }>;

  const transformedFavorites = favorites.map((fav) => ({
    id: fav.id,
    productId: fav.productId,
    createdAt: fav.createdAt,
    product: {
      id: fav.product.id,
      name:
        fav.product.name_en ||
        fav.product.name_ru ||
        fav.product.name_am ||
        fav.product.name,
      description: fav.product.description,
      basePrice: Number(fav.product.basePrice),
      stockQuantity: fav.product.stockQuantity,
      images: fav.product.images,
      brand: fav.product.brand,
      sku: fav.product.sku,
      status: fav.product.status,
      isActive: fav.product.isActive,
      shop: {
        id: fav.product.shop.id,
        code: fav.product.shop.fullCode,
        name: fav.product.shop.shopName,
        venue: fav.product.shop.venue,
        building: fav.product.shop.building,
        floor: fav.product.shop.floor,
      },
      category: fav.product.category
        ? {
            id: fav.product.category.id,
            name: {
              en: fav.product.category.name_en || "",
              ru: fav.product.category.name_ru || "",
              am: fav.product.category.name_am || "",
            },
          }
        : null,
    },
  }));

  const meta = getPaginationMeta(pagination.page, pagination.limit, total);

  return createSuccessResponse({
    favorites: transformedFavorites,
    meta,
  });
}
