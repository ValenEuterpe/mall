import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { createdResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";
import { createSubcategorySchema } from "../../schemas";

type RouteContext = { params: Promise<{ id: string }> };

async function createSubcategoryHandler(
  req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const { id: categoryId } = await params;
  const body = await req.json();
  const validated = createSubcategorySchema.parse(body);

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CATEGORY_NOT_FOUND",
          message: "Parent category not found",
        },
      },
      { status: 404 }
    );
  }

  const existing = await prisma.subcategory.findUnique({
    where: { key: validated.key },
  });

  if (existing) {
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

  const subcategory = await prisma.subcategory.create({
    data: {
      ...validated,
      categoryId,
    },
    include: {
      _count: { select: { products: true } },
      subSubcategories: true,
    },
  });

  return createdResponse(subcategory, "Subcategory created successfully");
}

export const POST = withMiddleware(createSubcategoryHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  auditAction: "CATEGORY_CREATED",
});
