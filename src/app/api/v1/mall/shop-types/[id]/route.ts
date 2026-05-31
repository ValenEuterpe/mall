import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { successResponse, noContentResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";
import { updateShopTypeSchema } from "../schemas";

type RouteContext = { params: Promise<{ id: string }> };

async function updateShopTypeHandler(
  req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const { id } = await params;
  const body = await req.json();
  const validated = updateShopTypeSchema.parse(body);

  const existing = await prisma.shopType.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "SHOP_TYPE_NOT_FOUND", message: "Shop type not found" },
      },
      { status: 404 }
    );
  }

  if (validated.key && validated.key !== existing.key) {
    const duplicate = await prisma.shopType.findFirst({
      where: { key: validated.key, id: { not: id } },
    });
    if (duplicate) {
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
  }

  const updated = await prisma.shopType.update({
    where: { id },
    data: validated,
  });

  return successResponse(updated, {
    message: "Shop type updated successfully",
  });
}

async function deleteShopTypeHandler(
  req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const { id } = await params;

  const existing = await prisma.shopType.findUnique({
    where: { id },
    include: { _count: { select: { shops: true } } },
  });

  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "SHOP_TYPE_NOT_FOUND", message: "Shop type not found" },
      },
      { status: 404 }
    );
  }

  if (existing._count.shops > 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SHOP_TYPE_IN_USE",
          message: `Cannot delete: ${existing._count.shops} shops are using this type`,
        },
      },
      { status: 409 }
    );
  }

  await prisma.shopType.delete({ where: { id } });

  return noContentResponse();
}

export const PUT = withMiddleware(updateShopTypeHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  auditAction: "SHOP_TYPE_UPDATED",
});

export const DELETE = withMiddleware(deleteShopTypeHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  auditAction: "SHOP_TYPE_DELETED",
});
