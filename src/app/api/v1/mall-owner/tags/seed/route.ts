import { NextRequest, NextResponse } from "next/server";
import { withAdminMiddleware } from "@/lib/api/middleware";
import { successResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";
import { buildTransliterations } from "@/lib/search/transliterate";
import fs from "fs";
import path from "path";

/**
 * POST /api/v1/mall-owner/tags/seed
 * Seed initial tags from the curated JSON file for a specific category
 */
async function seedTagsHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");

  if (!categoryId) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MISSING_CATEGORY_ID",
          message: "categoryId query parameter is required",
        },
      },
      { status: 400 }
    );
  }

  // Find category key
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { key: true },
  });

  if (!category) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CATEGORY_NOT_FOUND",
          message: "Category not found",
        },
      },
      { status: 404 }
    );
  }

  // Read seed file
  const seedPath = path.join(process.cwd(), "prisma/seeds/category-tags.json");
  if (!fs.existsSync(seedPath)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SEED_FILE_NOT_FOUND",
          message: "Seed file category-tags.json not found",
        },
      },
      { status: 500 }
    );
  }

  const allTags = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
  const tagsToSeed = allTags[category.key];

  if (!tagsToSeed || !Array.isArray(tagsToSeed)) {
    return successResponse({
      inserted: 0,
      skipped: 0,
      message: `No default tags found for category key "${category.key}"`,
    });
  }

  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < tagsToSeed.length; i++) {
    const tagData = tagsToSeed[i];
    
    const existing = await prisma.tag.findUnique({
      where: {
        categoryId_key: {
          categoryId,
          key: tagData.key,
        },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const transliteration = buildTransliterations([tagData.name_ru, tagData.name_am]).join(" ") || null;
    await prisma.tag.create({
      data: {
        categoryId,
        key: tagData.key,
        name_en: tagData.name_en,
        name_ru: tagData.name_ru,
        name_am: tagData.name_am,
        transliteration,
        sortOrder: i,
      },
    });
    inserted++;
  }

  return successResponse(
    { inserted, skipped },
    { message: `Successfully seeded ${inserted} tags (${skipped} skipped)` }
  );
}

export const POST = withAdminMiddleware(seedTagsHandler, {
  auditAction: "TAGS_SEEDED",
});
