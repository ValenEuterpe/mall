//src\app\api\v1\sellers\products\[id]\route.ts

import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { Prisma } from "@/prisma/generated/client";

import { withMiddleware } from "@/lib/api/middleware";
import { requireProductOwnership } from "@/lib/auth/ownership";

import { validateBody } from "@/lib/validation/request";
import {
  productUpdateSchema,
  type ProductUpdateInput,
} from "@/lib/validation/schemas/product";

import {
  successResponse,
  noContentResponse,
  methodNotAllowed,
} from "@/lib/api/response";

interface ProductResponse {
  id: string;
  name: string;
  name_en: string | null;
  name_ru: string | null;
  name_am: string | null;
  description: string | null;
  description_en: string | null;
  description_ru: string | null;
  description_am: string | null;
  basePrice: number;
  stockQuantity: number;
  shopId: string;
  categoryId: string | null;
  subcategoryId: string | null;
  images: string[];
  isActive: boolean;
  status: string;
  sku: string | null;
  barcode: string | null;
  priceTiers?: unknown[];
  discounts?: unknown[];
  category?: unknown;
  subcategory?: unknown;
}

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: true;
    subcategory: true;
    priceTiers: true;
    discounts: true;
  };
}>;

function mapProductToResponse(product: ProductWithRelations): ProductResponse {
  return {
    id: product.id,
    name: product.name,
    name_en: product.name_en ?? null,
    name_ru: product.name_ru ?? null,
    name_am: product.name_am ?? null,
    description: product.description ?? null,
    description_en: product.description_en ?? null,
    description_ru: product.description_ru ?? null,
    description_am: product.description_am ?? null,
    basePrice: product.basePrice.toNumber(),
    stockQuantity: product.stockQuantity,
    shopId: product.shopId,
    categoryId: product.categoryId,
    subcategoryId: product.subcategoryId,
    images: product.images,
    isActive: product.isActive,
    status: product.status,
    sku: product.sku,
    barcode: product.barcode,
    priceTiers: product.priceTiers,
    discounts: product.discounts,
    category: product.category ?? undefined,
    subcategory: product.subcategory ?? undefined,
  };
}

function buildProductUpdateData(input: ProductUpdateInput): Prisma.ProductUpdateInput {
  const { categoryId, subcategoryId, priceTiers, autoTranslate, ...rest } = input;
  void autoTranslate;

  const data: Prisma.ProductUpdateInput = {
    ...rest,
  };

  if (categoryId !== undefined) {
    data.category = categoryId
      ? { connect: { id: categoryId } }
      : { disconnect: true };
  }

  if (subcategoryId !== undefined) {
    data.subcategory = subcategoryId
      ? { connect: { id: subcategoryId } }
      : { disconnect: true };
  }

  void priceTiers;

  return data;
}

async function getHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  await requireProductOwnership(request, id);

  const product = await prisma.product.findUniqueOrThrow({
    where: { id },
    include: {
      category: true,
      subcategory: true,
      priceTiers: true,
      discounts: true,
    },
  });

  return successResponse(mapProductToResponse(product));
}

async function putHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  await requireProductOwnership(request, id);

  const input = await validateBody(request, productUpdateSchema);
  const data = buildProductUpdateData(input);

  const updated = await prisma.product.update({
    where: { id },
    data,
    include: {
      category: true,
      subcategory: true,
      priceTiers: true,
      discounts: true,
    },
  });

  return successResponse(mapProductToResponse(updated), {
    message: "Product updated successfully",
  });
}

async function deleteHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  await requireProductOwnership(request, id);

  await prisma.product.delete({ where: { id } });

  return noContentResponse();
}

export const GET = withMiddleware(getHandler, {
  requireAuth: true,
  allowedRoles: ["SELLER"],
  rateLimit: true,
  skipRateLimitForRoles: ["SELLER", "MALL_OWNER"],
  rateLimitMax: 60,
});

export const PUT = withMiddleware(putHandler, {
  requireAuth: true,
  allowedRoles: ["SELLER"],
  rateLimit: true,
  skipRateLimitForRoles: ["SELLER", "MALL_OWNER"],
  rateLimitMax: 20,
  auditAction: "PRODUCT_UPDATED",
});

export const DELETE = withMiddleware(deleteHandler, {
  requireAuth: true,
  allowedRoles: ["SELLER"],
  rateLimit: true,
  skipRateLimitForRoles: ["SELLER", "MALL_OWNER"],
  rateLimitMax: 10,
  auditAction: "PRODUCT_DELETED",
});

export const POST = () => methodNotAllowed(["GET", "PUT", "DELETE"]);
export const PATCH = () => methodNotAllowed(["GET", "PUT", "DELETE"]);
