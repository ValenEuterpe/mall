import { NextRequest, NextResponse } from "next/server";
import { optionalAuth } from "@/lib/api/auth-helper";
import prisma from "@/lib/db/prisma";
import { parseLocale, type SupportedLocale } from "@/lib/i18n/locale";
import { logger } from "@/lib/utils/logger";

/**
 * Legacy suggestions endpoint.
 *
 * The dropdown now calls `/api/v1/products?limit=8` directly so the dropdown
 * results stay in lockstep with the full-search results page. This endpoint is
 * kept for any external callers that still hit it; new callers should use the
 * main products list endpoint.
 */
export async function GET(request: NextRequest) {
  optionalAuth(request);

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const locale = parseLocale(searchParams.get("locale"));

  if (q.length < 2) {
    return NextResponse.json({
      success: true,
      data: { products: [] },
    });
  }

  const tokenizedQ = q.split(/\s+/).filter((w) => w.length >= 2);

  const localeNameCol: Record<SupportedLocale, string> = {
    en: "name_en",
    ru: "name_ru",
    am: "name_am",
  };
  const nameCol = localeNameCol[locale];

  try {
    const productRows = await prisma.$queryRawUnsafe<
      { id: string; name: string; image: string | null; categoryId: string }[]
    >(
      `SELECT p.id,
                      p.${nameCol} AS name,
                      p.images[1] AS image,
                      p."categoryId"
               FROM products p
               WHERE p.status = 'PUBLISHED' AND p."isActive" = true
                 AND (
                   p."searchTokens" && $1::text[]
                   OR p.name_en ILIKE $3
                   OR p.name_ru ILIKE $3
                   OR p.name_am ILIKE $3
                   OR EXISTS (SELECT 1 FROM unnest(p."searchTokens") AS token WHERE token ILIKE $3)
                   OR p.name_en % $2
                   OR p.name_ru % $2
                   OR p.name_am % $2
                 )
               ORDER BY GREATEST(
                   CASE WHEN EXISTS (SELECT 1 FROM unnest(p."searchTokens") AS token WHERE token ILIKE $3) THEN 2 ELSE 0 END,
                   CASE WHEN p.name_en ILIKE $3 THEN 2 ELSE 0 END,
                   CASE WHEN p.name_ru ILIKE $3 THEN 2 ELSE 0 END,
                   CASE WHEN p.name_am ILIKE $3 THEN 2 ELSE 0 END,
                   similarity(p.name_en, $2),
                   similarity(p.name_ru, $2),
                   similarity(p.name_am, $2)
               ) DESC NULLS LAST
               LIMIT 8`,
      tokenizedQ,
      q,
      `${q}%`
    );

    const response = NextResponse.json({
      success: true,
      data: {
        products: productRows,
      },
    });
    response.headers.set(
      "Cache-Control",
      "public, max-age=30, stale-while-revalidate=60"
    );
    return response;
  } catch (error) {
    logger.error("Failed to fetch search suggestions", { error, q, locale });
    return NextResponse.json({
      success: true,
      data: { products: [] },
    });
  }
}
