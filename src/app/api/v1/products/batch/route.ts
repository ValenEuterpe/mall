import { NextRequest, NextResponse } from "next/server";

import { createErrorResponse, createSuccessResponse, methodNotAllowed } from "@/app/response";
import prisma from "@/lib/db/prisma";
import { enforceRateLimit, publicReadRateLimiter } from "@/lib/utils/rate-limit";
import { productsBatchRequestSchema } from "./schemas";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const limited = enforceRateLimit(request, publicReadRateLimiter);
    if (limited) return limited.response;

    const body = await request.json().catch(() => null);
    const parsed = productsBatchRequestSchema.safeParse(body);

    if (!parsed.success) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        { details: parsed.error.flatten() }
      );
    }

    // Deduplicate while preserving order.
    const ids = Array.from(new Set(parsed.data.ids));

    const products = await prisma.product.findMany({
      where: {
        id: { in: ids },
        status: "PUBLISHED",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        images: true,
        basePrice: true,
        shop: {
          select: {
            id: true,
            fullCode: true,
            shopName: true,
            svgId: true,
          },
        },
        discounts: {
          where: {
            isActive: true,
            AND: [
              { OR: [{ startDate: null }, { startDate: { lte: new Date() } }] },
              { OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
            ],
          },
          take: 1,
          select: {
            id: true,
            discountType: true,
            discountValue: true,
          },
        },
      },
    });

    const transformed = products.map((p) => {
      const activeDiscount = p.discounts[0];
      let effectivePrice = Number(p.basePrice);
      if (activeDiscount) {
        if (activeDiscount.discountType === "percentage") {
          effectivePrice = effectivePrice * (1 - Number(activeDiscount.discountValue) / 100);
        } else if (activeDiscount.discountType === "fixed") {
          effectivePrice = effectivePrice - Number(activeDiscount.discountValue);
        }
        effectivePrice = Math.max(0, effectivePrice);
      }

      return {
        id: p.id,
        name: p.name,
        images: p.images,
        basePrice: p.basePrice,
        effectivePrice,
        hasDiscount: !!activeDiscount,
        discount: activeDiscount
          ? { type: activeDiscount.discountType, value: Number(activeDiscount.discountValue) }
          : null,
        shop: p.shop,
      };
    });

    const byId = new Map(transformed.map((p) => [p.id, p]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

    return createSuccessResponse({ products: ordered });
  } catch (error) {
    console.error("Unexpected error in POST /api/v1/products/batch:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred",
      500
    );
  }
}

export const GET = () => methodNotAllowed(["POST"]);
export const PUT = () => methodNotAllowed(["POST"]);
export const PATCH = () => methodNotAllowed(["POST"]);
export const DELETE = () => methodNotAllowed(["POST"]);
