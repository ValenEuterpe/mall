import { NextRequest, NextResponse } from "next/server";
import { transliterate } from "transliteration";
import { withMiddleware } from "@/lib/api/middleware";
import { successResponse, createdResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";
import { buildTransliterations } from "@/lib/search/transliterate";
import { translateText, isTranslationAvailable, type SupportedLocale } from "@/lib/translation";
import { tagSellerCreateSchema } from "@/lib/validation/schemas/tag";
import type { AuthenticatedUser } from "@/types/auth";

const NEAR_MATCH_THRESHOLD = 0.7;

interface DedupCandidate {
  id: string;
  key: string;
  name_en: string;
  name_ru: string;
  name_am: string | null;
  score: number;
}

/**
 * GET /api/v1/tags
 * Public list of tags, optionally filtered by category and subcategory.
 */
async function listTagsHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const subcategoryId = searchParams.get("subcategoryId");

  // Subcategory-scoped view: include subcategory-specific tags + category-level (subcategoryId NULL)
  const where: any = {};
  if (categoryId) where.categoryId = categoryId;
  if (subcategoryId) {
    where.OR = [
      { subcategoryId: subcategoryId },
      { subcategoryId: null }
    ];
  }

  const tags = await prisma.tag.findMany({
    where: where as never,
    orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      key: true,
      categoryId: true,
      subcategoryId: true,
      name_en: true,
      name_ru: true,
      name_am: true,
      sortOrder: true,
      canonicalTagId: true,
    },
  });

  return successResponse(tags);
}

function slugFrom(text: string): string {
  return transliterate(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

async function findNearMatches(params: {
  categoryId: string;
  subcategoryId: string | null;
  name_en: string;
  name_ru: string;
  name_am: string;
  transliteration: string;
}): Promise<DedupCandidate[]> {
  const { categoryId, subcategoryId, name_en, name_ru, name_am, transliteration } = params;

  // Subcategory-aware match: same subcategory OR category-level (NULL). If query has no subcategory, match anything in category.
  if (subcategoryId) {
    return prisma.$queryRaw<DedupCandidate[]>`
      SELECT id, key, name_en, name_ru, name_am,
             GREATEST(
               COALESCE(similarity(name_en, ${name_en}), 0),
               COALESCE(similarity(name_ru, ${name_ru}), 0),
               COALESCE(similarity(COALESCE(name_am, ''), ${name_am}), 0),
               COALESCE(similarity(COALESCE(transliteration, ''), ${transliteration}), 0)
             ) AS score
      FROM tags
      WHERE "categoryId" = ${categoryId}
        AND ("subcategoryId" IS NULL OR "subcategoryId" = ${subcategoryId})
      ORDER BY score DESC
      LIMIT 5
    `;
  }

  return prisma.$queryRaw<DedupCandidate[]>`
    SELECT id, key, name_en, name_ru, name_am,
           GREATEST(
             COALESCE(similarity(name_en, ${name_en}), 0),
             COALESCE(similarity(name_ru, ${name_ru}), 0),
             COALESCE(similarity(COALESCE(name_am, ''), ${name_am}), 0),
             COALESCE(similarity(COALESCE(transliteration, ''), ${transliteration}), 0)
           ) AS score
    FROM tags
    WHERE "categoryId" = ${categoryId}
    ORDER BY score DESC
    LIMIT 5
  `;
}

/**
 * POST /api/v1/tags
 * Seller (or mall-owner) creates a new tag in a category (optionally scoped to a subcategory).
 *
 * Behaviour:
 *  - Auto-translates missing name_* fields via Gemini when available.
 *  - Computes the Latin-form transliteration for in-DB fuzzy matching.
 *  - Runs a similarity dedup check; returns 409 NEAR_MATCH with candidates if score >= 0.7
 *    (unless `force: true` is set, which bypasses the check).
 *  - Slugifies `key` from name_en if not provided.
 *  - Stores createdBySellerId so the mall owner can later see authorship.
 */
async function createTagHandler(
  req: NextRequest,
  { user }: { params: Promise<unknown>; user: AuthenticatedUser }
) {
  const body = await req.json();
  const parsed = tagSellerCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid tag input",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 }
    );
  }

  const input = parsed.data;

  // Validate category exists
  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true },
  });
  if (!category) {
    return NextResponse.json(
      { success: false, error: { code: "CATEGORY_NOT_FOUND", message: "Category not found" } },
      { status: 404 }
    );
  }

  // Validate subcategory belongs to category if provided
  if (input.subcategoryId) {
    const sub = await prisma.subcategory.findUnique({
      where: { id: input.subcategoryId },
      select: { categoryId: true },
    });
    if (!sub || sub.categoryId !== input.categoryId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_SUBCATEGORY", message: "Subcategory does not belong to category" } },
        { status: 400 }
      );
    }
  }

  // Step 1: auto-translate missing fields if Gemini is available
  let name_en = (input.name_en ?? "").trim();
  let name_ru = (input.name_ru ?? "").trim();
  let name_am = (input.name_am ?? "").trim();

  const missingCount = [name_en, name_ru, name_am].filter((v) => !v).length;
  if (missingCount > 0 && isTranslationAvailable()) {
    // Pick the strongest source — prefer whichever the seller provided
    const source = name_ru || name_en || name_am;
    if (source) {
      try {
        const t = await translateText(source);
        if (!name_en) name_en = t.en;
        if (!name_ru) name_ru = t.ru;
        if (!name_am) name_am = t.am;
      } catch {
        // Translation is best-effort — fall through with whatever the seller gave us.
      }
    }
  }

  // Hard requirement: name_en and name_ru must end up non-empty (schema-level Tag columns are required).
  // If translation failed / unavailable, fall back to whatever the seller typed in any language.
  if (!name_en) name_en = name_ru || name_am || "";
  if (!name_ru) name_ru = name_en || name_am || "";
  // name_am may legitimately be empty.

  if (!name_en || !name_ru) {
    return NextResponse.json(
      { success: false, error: { code: "TRANSLATION_FAILED", message: "Unable to populate required name fields" } },
      { status: 400 }
    );
  }

  // Step 2: compute Latin transliteration
  const transliterationText = buildTransliterations([name_ru, name_am]).join(" ") || null;

  // Step 3: derive key if not provided
  const key = input.key || slugFrom(name_en) || slugFrom(name_ru) || `tag-${Date.now()}`;

  // Step 4: dedup check (skip when force=true)
  if (!input.force) {
    const candidates = await findNearMatches({
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId ?? null,
      name_en,
      name_ru,
      name_am: name_am || "",
      transliteration: transliterationText ?? "",
    });

    const best = candidates[0];
    if (best && best.score >= NEAR_MATCH_THRESHOLD) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NEAR_MATCH",
            message: "A similar tag already exists in this category",
            details: { candidates },
          },
        },
        { status: 409 }
      );
    }
  }

  // Step 5: insert. Uniqueness is on (categoryId, key); catch P2002 and retry with a suffix.
  let suffix = 0;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidateKey = suffix === 0 ? key : `${key}-${suffix}`;
    try {
      const tag = await prisma.tag.create({
        data: {
          key: candidateKey,
          categoryId: input.categoryId,
          subcategoryId: input.subcategoryId ?? null,
          name_en,
          name_ru,
          name_am: name_am || null,
          transliteration: transliterationText,
          createdBySellerId: user.role === "SELLER" ? user.userId : null,
        },
      });
      return createdResponse(tag, "Tag created");
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === "P2002") {
        suffix++;
        continue;
      }
      throw e;
    }
  }

  return NextResponse.json(
    { success: false, error: { code: "DUPLICATE_TAG", message: "Could not allocate a unique tag key" } },
    { status: 409 }
  );
}

export const GET = withMiddleware(listTagsHandler, {
  requireAuth: false,
  rateLimit: true,
});

export const POST = withMiddleware(createTagHandler, {
  requireAuth: true,
  allowedRoles: ["SELLER", "MALL_OWNER"],
  rateLimit: true,
  auditAction: "TAG_CREATED_BY_SELLER",
});
