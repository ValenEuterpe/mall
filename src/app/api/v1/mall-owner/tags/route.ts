import { NextRequest, NextResponse } from "next/server";
import { transliterate } from "transliteration";
import { withAdminMiddleware } from "@/lib/api/middleware";
import { successResponse, createdResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";
import { tagCreateSchema } from "@/lib/validation/schemas/tag";
import { computeTagTransliteration } from "@/lib/search/refresh-tag-transliteration";

function slugFrom(text: string): string {
  return transliterate(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/**
 * GET /api/v1/mall-owner/tags
 * List tags, optionally filtered by category. Includes product usage count.
 */
async function listTagsHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");

  const where = categoryId ? { categoryId } : {};

  const tags = await prisma.tag.findMany({
    where,
    orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
    include: {
      category: {
        select: { name_en: true, key: true },
      },
      subcategory: {
        select: {
          id: true,
          name_en: true,
          name_ru: true,
          name_am: true,
          key: true,
        },
      },
      _count: {
        select: { products: true },
      },
    },
  });

  // Manual join for seller names (since relation is not in schema.prisma)
  const sellerIds = [
    ...new Set(tags.map((t) => t.createdBySellerId).filter(Boolean)),
  ] as string[];
  const sellers =
    sellerIds.length > 0
      ? await prisma.seller.findMany({
          where: { id: { in: sellerIds } },
          select: { id: true, businessName: true },
        })
      : [];

  const sellerMap = Object.fromEntries(
    sellers.map((s) => [s.id, s.businessName])
  );

  const data = tags.map((t) => ({
    ...t,
    createdBySeller: t.createdBySellerId
      ? {
          id: t.createdBySellerId,
          businessName: sellerMap[t.createdBySellerId] || "Unknown Seller",
        }
      : null,
  }));

  return successResponse(data);
}

/**
 * POST /api/v1/mall-owner/tags
 * Create a new tag. Auto-computes transliteration and derives key from name_en if absent.
 */
async function createTagHandler(req: NextRequest) {
  const body = await req.json();
  const validated = tagCreateSchema.parse(body);

  const key =
    validated.key || slugFrom(validated.name_en) || `tag-${Date.now()}`;

  // Validate subcategory ↔ category relationship if provided
  if (validated.subcategoryId) {
    const sub = await prisma.subcategory.findUnique({
      where: { id: validated.subcategoryId },
      select: { categoryId: true },
    });
    if (!sub || sub.categoryId !== validated.categoryId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_SUBCATEGORY",
            message: "Subcategory does not belong to category",
          },
        },
        { status: 400 }
      );
    }
  }

  const existing = await prisma.tag.findUnique({
    where: { categoryId_key: { categoryId: validated.categoryId, key } },
  });
  if (existing) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DUPLICATE_TAG",
          message: `Tag with key "${key}" already exists in this category`,
        },
      },
      { status: 409 }
    );
  }

  const transliterationText = computeTagTransliteration({
    name_ru: validated.name_ru,
    name_am: validated.name_am ?? null,
  });

  const tag = await prisma.tag.create({
    data: {
      key,
      categoryId: validated.categoryId,
      subcategoryId: validated.subcategoryId ?? null,
      name_en: validated.name_en,
      name_ru: validated.name_ru,
      name_am: validated.name_am ?? null,
      sortOrder: validated.sortOrder ?? 0,
      transliteration: transliterationText,
    },
  });

  return createdResponse(tag, "Tag created successfully");
}

export const GET = withAdminMiddleware(listTagsHandler);
export const POST = withAdminMiddleware(createTagHandler, {
  auditAction: "TAG_CREATED",
});
