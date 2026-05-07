import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";

import { withMiddleware } from "@/lib/api/middleware";
import { requireProductOwnership } from "@/lib/auth/ownership";
import { validateBody } from "@/lib/validation/request";
import {
  discountUpdateSchema,
  type DiscountUpdateInput,
} from "@/lib/validation/schemas/product";
import {
  successResponse,
  noContentResponse,
  methodNotAllowed,
} from "@/lib/api/response";
import { NotFoundError } from "@/lib/errors";

async function putHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string; discountId: string }> }
) {
  const { id, discountId } = await context.params;

  await requireProductOwnership(request, id);

  const existing = await prisma.productDiscount.findFirst({
    where: { id: discountId, productId: id },
  });
  if (!existing) {
    throw new NotFoundError("Discount");
  }

  const input: DiscountUpdateInput = await validateBody(
    request,
    discountUpdateSchema
  );

  const updated = await prisma.productDiscount.update({
    where: { id: discountId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.name_en !== undefined && { name_en: input.name_en }),
      ...(input.name_ru !== undefined && { name_ru: input.name_ru }),
      ...(input.name_am !== undefined && { name_am: input.name_am }),
      ...(input.discountType !== undefined && {
        discountType: input.discountType,
      }),
      ...(input.discountValue !== undefined && {
        discountValue: input.discountValue,
      }),
      ...(input.startDate !== undefined && {
        startDate: input.startDate ? new Date(input.startDate) : null,
      }),
      ...(input.endDate !== undefined && {
        endDate: input.endDate ? new Date(input.endDate) : null,
      }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });

  return successResponse({
    id: updated.id,
    name: updated.name,
    name_en: updated.name_en,
    name_ru: updated.name_ru,
    name_am: updated.name_am,
    discountType: updated.discountType,
    discountValue: updated.discountValue.toNumber(),
    startDate: updated.startDate?.toISOString() ?? null,
    endDate: updated.endDate?.toISOString() ?? null,
    isActive: updated.isActive,
  });
}

async function deleteHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string; discountId: string }> }
) {
  const { id, discountId } = await context.params;

  await requireProductOwnership(request, id);

  const existing = await prisma.productDiscount.findFirst({
    where: { id: discountId, productId: id },
  });
  if (!existing) {
    throw new NotFoundError("Discount");
  }

  await prisma.productDiscount.delete({ where: { id: discountId } });

  return noContentResponse();
}

export const PUT = withMiddleware(putHandler, {
  requireAuth: true,
  allowedRoles: ["SELLER"],
  rateLimit: true,
  skipRateLimitForRoles: ["SELLER", "MALL_OWNER"],
  rateLimitMax: 20,
});

export const DELETE = withMiddleware(deleteHandler, {
  requireAuth: true,
  allowedRoles: ["SELLER"],
  rateLimit: true,
  skipRateLimitForRoles: ["SELLER", "MALL_OWNER"],
  rateLimitMax: 10,
});

export const GET = () => methodNotAllowed(["PUT", "DELETE"]);
export const POST = () => methodNotAllowed(["PUT", "DELETE"]);
