import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { successResponse, createdResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";
import { createShopTypeSchema } from "./schemas";

async function listShopTypesHandler(
  _req: NextRequest
): Promise<NextResponse> {
  const shopTypes = await prisma.shopType.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { shops: true } },
    },
  });

  return successResponse(shopTypes);
}

async function createShopTypeHandler(
  req: NextRequest
): Promise<NextResponse> {
  const body = await req.json();
  const validated = createShopTypeSchema.parse(body);

  const existing = await prisma.shopType.findUnique({
    where: { key: validated.key },
  });

  if (existing) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DUPLICATE_KEY",
          message: `Shop type with key "${validated.key}" already exists`,
        },
      },
      { status: 409 }
    );
  }

  const shopType = await prisma.shopType.create({
    data: validated,
  });

  return createdResponse(shopType, "Shop type created successfully");
}

export const GET = withMiddleware(listShopTypesHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
});

export const POST = withMiddleware(createShopTypeHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  auditAction: "SHOP_TYPE_CREATED",
});
