import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { successResponse } from "@/lib/api/response";
import { getProductListSelect } from "../helpers/selects";
import { transformProductForList } from "../helpers/transform";
import { parseLocale } from "@/lib/i18n/locale";

/**
 * Fisher-Yates shuffle (in place).
 */
function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * GET /api/v1/products/promotions?limit=10
 *
 * Returns random products for the map promotion overlay.
 * Products must have at least one image and belong to a shop with a svgId.
 *
 * Designed to be easily extended with advertiser-driven promotions later.
 */
export async function getPromotionsHandler(
  request: NextRequest
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const limitParam = parseInt(searchParams.get("limit") ?? "10", 10);
  const limit = Math.min(Math.max(1, limitParam), 20);
  const locale = parseLocale(searchParams.get("locale"));

  // Step 1: Lightweight query for eligible product IDs
  const candidates = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      isActive: true,
      images: { isEmpty: false },
      shop: {
        svgId: { not: null },
        isActive: true,
      },
    },
    select: { id: true, shopId: true },
  });

  if (candidates.length === 0) {
    return successResponse({ products: [] });
  }

  // Step 2: Shuffle and pick up to `limit` products
  shuffleArray(candidates);
  const selectedIds = candidates.slice(0, limit).map((c) => c.id);

  // Step 3: Fetch full data for selected products
  const products = await prisma.product.findMany({
    where: { id: { in: selectedIds } },
    select: getProductListSelect(),
  });

  // Transform and filter to only those with svgId
  const transformed = products
    .map((product) => transformProductForList(product, locale))
    .filter((p) => p.shop.svgId);

  // Shuffle the result to avoid ordering by ID
  shuffleArray(transformed);

  const headers = new Headers();
  headers.set("Cache-Control", "public, max-age=30, stale-while-revalidate=15");

  return successResponse(
    { products: transformed },
    200,
    Object.fromEntries(headers)
  );
}
