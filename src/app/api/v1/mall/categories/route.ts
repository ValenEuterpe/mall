import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { successResponse, createdResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";
import { createCategorySchema } from "./schemas";

async function listCategoriesAdminHandler(
  _req: NextRequest
): Promise<NextResponse> {
  const categories = await prisma.category.findMany({
    orderBy: { key: "asc" },
    include: {
      _count: { select: { products: true } },
      subcategories: {
        orderBy: { key: "asc" },
        include: {
          _count: { select: { products: true } },
          subSubcategories: {
            orderBy: { key: "asc" },
            include: {
              _count: { select: { products: true } },
            },
          },
        },
      },
    },
  });

  return successResponse(categories);
}

async function createCategoryHandler(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const validated = createCategorySchema.parse(body);

  const existing = await prisma.category.findUnique({
    where: { key: validated.key },
  });

  if (existing) {
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

  const category = await prisma.category.create({
    data: validated,
    include: {
      _count: { select: { products: true } },
      subcategories: true,
    },
  });

  return createdResponse(category, "Category created successfully");
}

export const GET = withMiddleware(listCategoriesAdminHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
});

export const POST = withMiddleware(createCategoryHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  auditAction: "CATEGORY_CREATED",
});
