//src\app\api\v1\sellers\products\[id]\route.ts

import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { Prisma } from "@/prisma/generated/client";
import { isTranslationAvailable } from "@/lib/translation";
import { generateSearchMetadata } from "@/lib/search/ai-metadata";
import { buildSearchTokens } from "@/lib/search/tokens";
import { logger } from "@/lib/utils/logger";

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
  tagIds?: string[];
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
    productTags: {
      select: {
        tagId: true;
      };
    };
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
    tagIds: product.productTags.map((pt) => pt.tagId),
    priceTiers: product.priceTiers,
    discounts: product.discounts,
    category: product.category ?? undefined,
    subcategory: product.subcategory ?? undefined,
  };
}

function buildProductUpdateData(
  input: ProductUpdateInput
): Prisma.ProductUpdateInput {
  const {
    categoryId,
    subcategoryId,
    priceTiers,
    autoTranslate,
    tagIds,
    tags,
    ...rest
  } = input;
  void autoTranslate;
  void tagIds;
  void tags;

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
      productTags: { select: { tagId: true } },
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

  let finalTagIds = input.tagIds;
  let data = buildProductUpdateData(input);

  // AI Tagging if autoTranslate is requested
  if (input.autoTranslate && isTranslationAvailable()) {
    try {
      const currentProduct = await prisma.product.findUnique({
        where: { id },
        select: {
          categoryId: true,
          name_en: true,
          description_en: true,
          category: { select: { name_en: true } },
        },
      });

      const categoryId = input.categoryId || currentProduct?.categoryId;
      if (categoryId) {
        const availableTags = await prisma.tag.findMany({
          where: { categoryId },
          select: { id: true, key: true, name_en: true },
        });

        if (availableTags.length > 0) {
          const metadata = await generateSearchMetadata({
            name: input.name_en || currentProduct?.name_en || "",
            description:
              input.description_en || currentProduct?.description_en || null,
            categoryId,
            availableTags,
          });

          if (metadata.tagIds.length > 0) {
            finalTagIds = Array.from(
              new Set([...(finalTagIds || []), ...metadata.tagIds])
            );
          }

          if (metadata.keywords.length > 0) data.keywords = metadata.keywords;
          if (metadata.productType) data.productType = metadata.productType;
          if (metadata.brand && !input.brand) data.brand = metadata.brand;
        }
      }
    } catch (error) {
      logger.error("AI metadata generation during update failed", { error });
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.product.update({
      where: { id },
      data,
      include: {
        category: true,
        subcategory: true,
        priceTiers: true,
        discounts: true,
        productTags: { select: { tagId: true } },
      },
    });

    if (finalTagIds !== undefined) {
      // Sync tags: delete existing and create new
      await tx.productTag.deleteMany({ where: { productId: id } });
      if (finalTagIds.length > 0) {
        await tx.productTag.createMany({
          data: finalTagIds.map((tagId) => ({
            productId: id,
            tagId,
          })),
        });
      }
    }

    return p;
  });

  // Re-fetch to get updated tagIds
  const fullUpdated = await prisma.product.findUniqueOrThrow({
    where: { id },
    include: {
      category: true,
      subcategory: true,
      priceTiers: true,
      discounts: true,
      productTags: { select: { tagId: true } },
    },
  });

  // Recompute searchTokens from the merged post-update view
  await prisma.product.update({
    where: { id },
    data: {
      searchTokens: buildSearchTokens({
        name_en: fullUpdated.name_en,
        name_ru: fullUpdated.name_ru,
        name_am: fullUpdated.name_am,
        description_en: fullUpdated.description_en,
        description_ru: fullUpdated.description_ru,
        description_am: fullUpdated.description_am,
        brand: fullUpdated.brand,
        productType: fullUpdated.productType,
        keywords: fullUpdated.keywords,
        sku: fullUpdated.sku,
      }),
    },
  });

  return successResponse(mapProductToResponse(fullUpdated), {
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
