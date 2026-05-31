import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { successResponse } from "@/lib/api/response";

import type { FormattedCategory } from "../types";
import { CATEGORY_SELECT } from "../selects";
import { CACHE_MAX_AGE, CACHE_STALE_WHILE_REVALIDATE } from "../constants";
import { parseLocale } from "@/lib/i18n/locale";
import { formatCategory } from "../utils/format-category";
import { flattenCategories } from "../utils/flatten-categories";

export async function listCategoriesHandler(
  request: NextRequest
): Promise<import("next/server").NextResponse> {
  const { searchParams } = new URL(request.url);

  // Parse query parameters
  const locale = parseLocale(searchParams.get("locale"));
  const includeEmpty = searchParams.get("includeEmpty") === "true";
  const flat = searchParams.get("flat") === "true";

  // Fetch categories with subcategories and counts
  const categories = await prisma.category.findMany({
    select: CATEGORY_SELECT,
    orderBy: [{ key: "asc" }],
  });

  // Format categories
  const formatted = categories
    .map((cat) => formatCategory(cat, locale, includeEmpty))
    .filter((cat): cat is FormattedCategory => cat !== null);

  // Prepare response
  const responseData = flat
    ? {
        items: flattenCategories(formatted),
        total: formatted.length,
      }
    : {
        categories: formatted,
        total: formatted.length,
        locale,
      };

  // Add cache headers
  const headers = new Headers();
  headers.set(
    "Cache-Control",
    `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_STALE_WHILE_REVALIDATE}`
  );
  headers.set("Vary", "Accept-Language");

  return successResponse(responseData, 200, Object.fromEntries(headers));
}
