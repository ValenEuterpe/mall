import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { successResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";
import { buildTransliterations } from "@/lib/search/transliterate";

interface DedupCandidate {
  id: string;
  key: string;
  name_en: string;
  name_ru: string;
  name_am: string | null;
  score: number;
}

/**
 * POST /api/v1/tags/dedup-check
 * Public (rate-limited). Returns the top 5 similar existing tags for the seller's
 * "did you mean…" suggestions while they type in the create-tag dialog.
 *
 * Body: { categoryId, subcategoryId?, name_en?, name_ru?, name_am? }  OR  { categoryId, q }
 */
async function dedupCheckHandler(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid body" },
      },
      { status: 400 }
    );
  }

  const { categoryId, subcategoryId, name_en, name_ru, name_am, q } = body as {
    categoryId?: string;
    subcategoryId?: string | null;
    name_en?: string | null;
    name_ru?: string | null;
    name_am?: string | null;
    q?: string | null;
  };

  if (!categoryId) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "categoryId is required" },
      },
      { status: 400 }
    );
  }

  // Build comparison strings. `q` is a convenience for "I only have one input string" callers.
  const en = (name_en ?? q ?? "").trim();
  const ru = (name_ru ?? q ?? "").trim();
  const am = (name_am ?? q ?? "").trim();
  const transliterationText =
    buildTransliterations([ru, am]).join(" ") || (q ?? "").toLowerCase();

  if (!en && !ru && !am && !transliterationText) {
    return successResponse({ candidates: [] as DedupCandidate[] });
  }

  let candidates: DedupCandidate[];
  if (subcategoryId) {
    candidates = await prisma.$queryRaw<DedupCandidate[]>`
      SELECT id, key, name_en, name_ru, name_am,
             GREATEST(
               COALESCE(similarity(name_en, ${en}), 0),
               COALESCE(similarity(name_ru, ${ru}), 0),
               COALESCE(similarity(COALESCE(name_am, ''), ${am}), 0),
               COALESCE(similarity(COALESCE(transliteration, ''), ${transliterationText}), 0)
             ) AS score
      FROM tags
      WHERE "categoryId" = ${categoryId}
        AND ("subcategoryId" IS NULL OR "subcategoryId" = ${subcategoryId})
      ORDER BY score DESC
      LIMIT 5
    `;
  } else {
    candidates = await prisma.$queryRaw<DedupCandidate[]>`
      SELECT id, key, name_en, name_ru, name_am,
             GREATEST(
               COALESCE(similarity(name_en, ${en}), 0),
               COALESCE(similarity(name_ru, ${ru}), 0),
               COALESCE(similarity(COALESCE(name_am, ''), ${am}), 0),
               COALESCE(similarity(COALESCE(transliteration, ''), ${transliterationText}), 0)
             ) AS score
      FROM tags
      WHERE "categoryId" = ${categoryId}
      ORDER BY score DESC
      LIMIT 5
    `;
  }

  // Filter out very low scores — anything below 0.2 is noise.
  const filtered = candidates.filter((c) => c.score >= 0.2);

  return successResponse({ candidates: filtered });
}

export const POST = withMiddleware(dedupCheckHandler, {
  requireAuth: false,
  rateLimit: true,
  csrf: false, // read-only lookup, safe for anonymous callers
});
