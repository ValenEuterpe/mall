import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { createdResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";
import { createSubSubcategorySchema } from "../../../schemas";

type RouteContext = { params: Promise<{ id: string }> };

async function createSubSubcategoryHandler(
  req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const { id: subcategoryId } = await params;
  const body = await req.json();
  const validated = createSubSubcategorySchema.parse(body);

  const subcategory = await prisma.subcategory.findUnique({
    where: { id: subcategoryId },
  });

  if (!subcategory) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SUBCATEGORY_NOT_FOUND",
          message: "Parent subcategory not found",
        },
      },
      { status: 404 }
    );
  }

  const existing = await prisma.subSubcategory.findUnique({
    where: { key: validated.key },
  });

  if (existing) {
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

  const subSubcategory = await prisma.subSubcategory.create({
    data: {
      ...validated,
      subcategoryId,
    },
    include: {
      _count: { select: { products: true } },
    },
  });

  return createdResponse(
    subSubcategory,
    "Sub-subcategory created successfully"
  );
}

export const POST = withMiddleware(createSubSubcategoryHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  auditAction: "CATEGORY_CREATED",
});
