import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { successResponse, noContentResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";
import { updateSubSubcategorySchema } from "../../schemas";

type RouteContext = { params: Promise<{ id: string }> };

async function updateSubSubcategoryHandler(
  req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const { id } = await params;
  const body = await req.json();
  const validated = updateSubSubcategorySchema.parse(body);

  const existing = await prisma.subSubcategory.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SUB_SUBCATEGORY_NOT_FOUND",
          message: "Sub-subcategory not found",
        },
      },
      { status: 404 }
    );
  }

  if (validated.key && validated.key !== existing.key) {
    const duplicate = await prisma.subSubcategory.findFirst({
      where: { key: validated.key, id: { not: id } },
    });
    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_KEY",
            message: `Sub-subcategory with key "${validated.key}" already exists`,
          },
        },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.subSubcategory.update({
    where: { id },
    data: validated,
    include: {
      _count: { select: { products: true } },
    },
  });

  return successResponse(updated, {
    message: "Sub-subcategory updated successfully",
  });
}

async function deleteSubSubcategoryHandler(
  req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const { id } = await params;

  const existing = await prisma.subSubcategory.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });

  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SUB_SUBCATEGORY_NOT_FOUND",
          message: "Sub-subcategory not found",
        },
      },
      { status: 404 }
    );
  }

  if (existing._count.products > 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SUB_SUBCATEGORY_HAS_PRODUCTS",
          message: `Cannot delete: ${existing._count.products} products are assigned to this sub-subcategory`,
        },
      },
      { status: 409 }
    );
  }

  await prisma.subSubcategory.delete({ where: { id } });

  return noContentResponse();
}

export const PUT = withMiddleware(updateSubSubcategoryHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  auditAction: "CATEGORY_UPDATED",
});

export const DELETE = withMiddleware(deleteSubSubcategoryHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  auditAction: "CATEGORY_DELETED",
});
