import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { successResponse, noContentResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";
import { updateCategorySchema } from "../schemas";

type RouteContext = { params: Promise<{ id: string }> };

async function updateCategoryHandler(
  req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const { id } = await params;
  const body = await req.json();
  const validated = updateCategorySchema.parse(body);

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "CATEGORY_NOT_FOUND", message: "Category not found" },
      },
      { status: 404 }
    );
  }

  if (validated.key && validated.key !== existing.key) {
    const duplicate = await prisma.category.findFirst({
      where: { key: validated.key, id: { not: id } },
    });
    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_KEY",
            message: `Category with key "${validated.key}" already exists`,
          },
        },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.category.update({
    where: { id },
    data: validated,
    include: {
      _count: { select: { products: true } },
      subcategories: {
        orderBy: { key: "asc" },
        include: {
          _count: { select: { products: true } },
          subSubcategories: {
            orderBy: { key: "asc" },
            include: { _count: { select: { products: true } } },
          },
        },
      },
    },
  });

  return successResponse(updated, { message: "Category updated successfully" });
}

async function deleteCategoryHandler(
  req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const { id } = await params;

  const existing = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: { select: { products: true } },
      subcategories: {
        include: {
          _count: { select: { products: true } },
          subSubcategories: {
            include: { _count: { select: { products: true } } },
          },
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "CATEGORY_NOT_FOUND", message: "Category not found" },
      },
      { status: 404 }
    );
  }

  const totalProducts =
    existing._count.products +
    existing.subcategories.reduce(
      (sum, sub) =>
        sum +
        sub._count.products +
        sub.subSubcategories.reduce((s, ss) => s + ss._count.products, 0),
      0
    );

  if (totalProducts > 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CATEGORY_HAS_PRODUCTS",
          message: `Cannot delete: ${totalProducts} products are assigned to this category or its subcategories`,
        },
      },
      { status: 409 }
    );
  }

  await prisma.category.delete({ where: { id } });

  return noContentResponse();
}

export const PUT = withMiddleware(updateCategoryHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  auditAction: "CATEGORY_UPDATED",
});

export const DELETE = withMiddleware(deleteCategoryHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  auditAction: "CATEGORY_DELETED",
});
