import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/db/prisma";
import {
  createErrorResponse,
  createSuccessResponse,
  methodNotAllowed,
} from "@/app/response";
import { activeDiscountWhere } from "@/app/api/v1/products/helpers/selects";
import { logger } from "@/lib/utils/logger";
import { enforceRateLimit, publicReadRateLimiter } from "@/lib/utils/rate-limit";
import { shopCodeSchema, shopProductsQuerySchema } from "./schemas";
import { parseLocale, getLocalizedText } from "@/lib/i18n/locale";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  try {
    const limited = enforceRateLimit(request, publicReadRateLimiter);
    if (limited) return limited.response;

    const { searchParams } = new URL(request.url);
    const locale = parseLocale(searchParams.get("locale"));
    const queryParsed = shopProductsQuerySchema.safeParse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    if (!queryParsed.success) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Invalid query parameters",
        400,
        { details: queryParsed.error.flatten() }
      );
    }

    const { code } = await context.params;
    const codeParsed = shopCodeSchema.safeParse(code);
    if (!codeParsed.success) {
      return createErrorResponse("VALIDATION_ERROR", "Invalid shop code", 400);
    }

    const shop = await prisma.shop.findUnique({
      where: { fullCode: codeParsed.data },
      select: {
        id: true,
        venue: true,
        building: true,
        floor: true,
        shopNumber: true,
        fullCode: true,
        shopName: true,
        description: true,
        imageUrl: true,
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
            phone: true,
            description: true,
            logoUrl: true,
            socialLinks: true,
            isVerified: true,
          },
        },
      },
    });

    if (!shop) {
      return createErrorResponse("NOT_FOUND", "Shop not found", 404);
    }

    const { page, limit } = queryParsed.data;
    const skip = (page - 1) * limit;
    const shopId = shop.id;

    const [total, products] = await Promise.all([
      prisma.product.count({
        where: {
          shopId,
          status: "PUBLISHED",
          isActive: true,
        },
      }),
      prisma.product.findMany({
        where: {
          shopId,
          status: "PUBLISHED",
          isActive: true,
        },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          name_en: true,
          name_ru: true,
          name_am: true,
          description: true,
          description_en: true,
          description_ru: true,
          description_am: true,
          basePrice: true,
          stockQuantity: true,
          images: true,
          brand: true,
          categoryId: true,
          category: {
            select: {
              id: true,
              name_en: true,
              name_ru: true,
              name_am: true,
            },
          },
          discounts: {
            where: activeDiscountWhere(),
            take: 1,
            select: {
              id: true,
              discountValue: true,
              discountType: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const transformedProducts = products.map((p) => {
      const activeDiscount = p.discounts?.[0];
      let effectivePrice = Number(p.basePrice);
      if (activeDiscount) {
        if (activeDiscount.discountType === "percentage") {
          effectivePrice =
            effectivePrice * (1 - Number(activeDiscount.discountValue) / 100);
        } else if (activeDiscount.discountType === "fixed") {
          effectivePrice =
            effectivePrice - Number(activeDiscount.discountValue);
        }
        effectivePrice = Math.max(0, effectivePrice);
      }
      return {
        id: p.id,
        name:
          getLocalizedText(locale, {
            legacy: p.name,
            en: p.name_en,
            ru: p.name_ru,
            am: p.name_am,
          }) ?? "",
        description: getLocalizedText(locale, {
          legacy: p.description,
          en: p.description_en,
          ru: p.description_ru,
          am: p.description_am,
        }),
        basePrice: p.basePrice,
        effectivePrice: activeDiscount ? effectivePrice : undefined,
        hasDiscount: !!activeDiscount,
        discount: activeDiscount
          ? {
              type: activeDiscount.discountType,
              value: activeDiscount.discountValue,
            }
          : null,
        stockQuantity: p.stockQuantity,
        images: p.images,
        brand: p.brand,
        categoryId: p.categoryId ?? null,
        category: p.category
          ? {
              id: p.category.id,
              name_en: p.category.name_en,
              name_ru: p.category.name_ru,
              name_am: p.category.name_am ?? null,
            }
          : null,
      };
    });

    return createSuccessResponse({
      shop,
      products: transformedProducts,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch shop by code", { error });
    return createErrorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred",
      500
    );
  }
}

export const POST = () => methodNotAllowed(["GET"]);
export const PUT = () => methodNotAllowed(["GET"]);
export const PATCH = () => methodNotAllowed(["GET"]);
export const DELETE = () => methodNotAllowed(["GET"]);
