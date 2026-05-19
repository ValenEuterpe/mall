import { NextRequest, NextResponse } from "next/server";
import { withAdminMiddleware } from "@/lib/api/middleware";
import { successResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";
import { tagUpdateSchema } from "@/lib/validation/schemas/tag";
import { buildTransliterations } from "@/lib/search/transliterate";

async function updateTagHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const validated = tagUpdateSchema.parse(body);

  // Validate subcategory ↔ category relationship if subcategory is being changed
  if (validated.subcategoryId) {
    const existing = await prisma.tag.findUnique({
      where: { id },
      select: { categoryId: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "TAG_NOT_FOUND", message: "Tag not found" } },
        { status: 404 }
      );
    }
    const sub = await prisma.subcategory.findUnique({
      where: { id: validated.subcategoryId },
      select: { categoryId: true },
    });
    if (!sub || sub.categoryId !== existing.categoryId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_SUBCATEGORY", message: "Subcategory does not belong to category" } },
        { status: 400 }
      );
    }
  }

  // Recompute transliteration whenever a Russian or Armenian name changes.
  let transliterationUpdate: { transliteration: string | null } | Record<string, never> = {};
  if (validated.name_ru !== undefined || validated.name_am !== undefined) {
    const current = await prisma.tag.findUnique({
      where: { id },
      select: { name_ru: true, name_am: true },
    });
    if (current) {
      const next_ru = validated.name_ru ?? current.name_ru;
      const next_am = validated.name_am === undefined ? current.name_am : validated.name_am;
      transliterationUpdate = {
        transliteration: buildTransliterations([next_ru, next_am]).join(" ") || null,
      };
    }
  }

  const tag = await prisma.tag.update({
    where: { id },
    data: { ...validated, ...transliterationUpdate },
  });

  return successResponse(tag, { message: "Tag updated successfully" });
}

async function deleteTagHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.tag.delete({
    where: { id },
  });

  return successResponse(null, { message: "Tag deleted successfully" });
}

export const PATCH = withAdminMiddleware(updateTagHandler, {
  auditAction: "TAG_UPDATED",
});

export const DELETE = withAdminMiddleware(deleteTagHandler, {
  auditAction: "TAG_DELETED",
});
