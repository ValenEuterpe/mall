import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { successResponse, noContentResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";
import { updateSubcategorySchema } from "../../schemas";

type RouteContext = { params: Promise<{ id: string }> };

async function updateSubcategoryHandler(
  req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const { id } = await params;
  const body = await req.json();
  const validated = updateSubcategorySchema.parse(body);

  const existing = await prisma.subcategory.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SUBCATEGORY_NOT_FOUND",
          message: "Subcategory not found",
        },
      },
      { status: 404 }
    );
  }

  if (validated.key && validated.key !== existing.key) {
    const duplicate = await prisma.subcategory.findFirst({
      where: { key: validated.key, id: { not: id } },
    });
    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_KEY",
            message: `Subcategory with key "${validated.key}" already exists`,
          },
        },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.subcategory.update({
    where: { id },
    data: validated,
    include: {
      _count: { select: { products: true } },
      subSubcategories: {
        orderBy: { key: "asc" },
        include: { _count: { select: { products: true } } },
      },
    },
  });

  return successResponse(updated, {
    message: "Subcategory updated successfully",
  });
}

async function deleteSubcategoryHandler(
  req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const { id } = await params;

  const existing = await prisma.subcategory.findUnique({
    where: { id },
    include: {
      _count: { select: { products: true } },
      subSubcategories: {
        include: { _count: { select: { products: true } } },
      },
    },
  });

  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SUBCATEGORY_NOT_FOUND",
          message: "Subcategory not found",
        },
      },
      { status: 404 }
    );
  }

  const totalProducts =
    existing._count.products +
    existing.subSubcategories.reduce(
      (sum, ss) => sum + ss._count.products,
      0
    );

  if (totalProducts > 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SUBCATEGORY_HAS_PRODUCTS",
          message: `Cannot delete: ${totalProducts} products are assigned to this subcategory`,
        },
      },
      { status: 409 }
    );
  }

  await prisma.subcategory.delete({ where: { id } });

  return noContentResponse();
}

export const PUT = withMiddleware(updateSubcategoryHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  auditAction: "CATEGORY_UPDATED",
});

export const DELETE = withMiddleware(deleteSubcategoryHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  auditAction: "CATEGORY_DELETED",
});
