import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-helper";
import prisma from "@/lib/db/prisma";
import { validateBody } from "@/lib/validation/request";
import { productCreateSchema } from "@/lib/validation/schemas/product";
import { createdResponse } from "@/lib/api/response";
import { NotFoundError, ForbiddenError } from "@/lib/errors/custom-errors";
import { ProductStatus } from "@/prisma/generated/client";
import { logger } from "@/lib/utils/logger";
import { translateBatch, isTranslationAvailable } from "@/lib/translation";
import { generateSearchMetadata } from "@/lib/search/ai-metadata";
import { buildSearchTokens } from "@/lib/search/tokens";

import { getSellerShop } from "../queries/get-seller-shop";
import { checkForDuplicateSkuOrBarcode } from "../queries/product-duplicate-check";

/**
 * Helper to get multilingual fields, handling both legacy and new format
 */
function extractMultilingualFields(data: Record<string, unknown>) {
  // Get name from either format
  let name_en = data.name_en as string | undefined;
  let name_ru = data.name_ru as string | undefined;
  let name_am = data.name_am as string | undefined;

  // If legacy name provided but no multilingual, use it as the source
  if (data.name && !name_en && !name_ru && !name_am) {
    // Will be handled by auto-translate or set as default
    name_en = data.name as string;
  }

  // Same for descriptions
  let description_en = data.description_en as string | undefined;
  let description_ru = data.description_ru as string | undefined;
  let description_am = data.description_am as string | undefined;

  if (
    data.description &&
    !description_en &&
    !description_ru &&
    !description_am
  ) {
    description_en = data.description as string;
  }

  let detailDescription_en = data.detailDescription_en as string | undefined;
  let detailDescription_ru = data.detailDescription_ru as string | undefined;
  let detailDescription_am = data.detailDescription_am as string | undefined;

  if (
    data.detailDescription &&
    !detailDescription_en &&
    !detailDescription_ru &&
    !detailDescription_am
  ) {
    detailDescription_en = data.detailDescription as string;
  }

  return {
    name_en,
    name_ru,
    name_am,
    description_en,
    description_ru,
    description_am,
    detailDescription_en,
    detailDescription_ru,
    detailDescription_am,
  };
}

export async function createProductHandler(
  request: NextRequest
): Promise<NextResponse> {
  const user = requireAuth(request, ["SELLER"]);
  const data = await validateBody(request, productCreateSchema);

  const shop = await getSellerShop(user.userId);

  // Check duplicates (SKU is now required for duplicate detection)
  if (data.sku) {
    await checkForDuplicateSkuOrBarcode(shop.id, {
      sku: data.sku,
      barcode: data.barcode,
    });
  }

  // Validate category
  if (data.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
      select: { id: true },
    });
    if (!category) throw new NotFoundError("Category not found");
  }

  // Validate subcategory relation
  if (data.subcategoryId) {
    const subcategory = await prisma.subcategory.findUnique({
      where: { id: data.subcategoryId },
      select: { id: true, categoryId: true },
    });

    if (!subcategory) throw new NotFoundError("Subcategory not found");

    if (data.categoryId && subcategory.categoryId !== data.categoryId) {
      throw new ForbiddenError(
        "Subcategory does not belong to selected category"
      );
    }
  }

  // Validate sub-subcategory relation
  if (data.subSubcategoryId) {
    const subSubcategory = await prisma.subSubcategory.findUnique({
      where: { id: data.subSubcategoryId },
      select: { id: true, subcategoryId: true },
    });

    if (!subSubcategory) throw new NotFoundError("Sub-subcategory not found");

    if (
      data.subcategoryId &&
      subSubcategory.subcategoryId !== data.subcategoryId
    ) {
      throw new ForbiddenError(
        "Sub-subcategory does not belong to selected subcategory"
      );
    }
  }

  // Extract and prepare multilingual fields
  let multilingualFields = extractMultilingualFields(
    data as Record<string, unknown>
  );

  // Preparation for AI Tagging and Tag Association
  let finalTagIds = data.tagIds || [];
  let aiKeywords: string[] = [];
  let aiProductType: string | null = null;
  let aiBrand: string | null = null;

  // Auto-translate if requested and service is available
  if (data.autoTranslate && isTranslationAvailable()) {
    // Find the source text (first non-empty value)
    const sourceName =
      multilingualFields.name_en ||
      multilingualFields.name_ru ||
      multilingualFields.name_am;
    const sourceDesc =
      multilingualFields.description_en ||
      multilingualFields.description_ru ||
      multilingualFields.description_am;
    const sourceDetail =
      multilingualFields.detailDescription_en ||
      multilingualFields.detailDescription_ru ||
      multilingualFields.detailDescription_am;

    if (sourceName) {
      try {
        const translations = await translateBatch({
          name: sourceName,
          description: sourceDesc,
          detailDescription: sourceDetail,
        });

        // Apply translations
        if (translations.name) {
          multilingualFields.name_en =
            translations.name.en || multilingualFields.name_en;
          multilingualFields.name_ru =
            translations.name.ru || multilingualFields.name_ru;
          multilingualFields.name_am =
            translations.name.am || multilingualFields.name_am;
        }
        if (translations.description) {
          multilingualFields.description_en =
            translations.description.en || multilingualFields.description_en;
          multilingualFields.description_ru =
            translations.description.ru || multilingualFields.description_ru;
          multilingualFields.description_am =
            translations.description.am || multilingualFields.description_am;
        }
        if (translations.detailDescription) {
          multilingualFields.detailDescription_en =
            translations.detailDescription.en ||
            multilingualFields.detailDescription_en;
          multilingualFields.detailDescription_ru =
            translations.detailDescription.ru ||
            multilingualFields.detailDescription_ru;
          multilingualFields.detailDescription_am =
            translations.detailDescription.am ||
            multilingualFields.detailDescription_am;
        }

        logger.info("Auto-translated product fields", {
          sellerId: user.userId,
          sourceName,
        });

        // AI Tagging (only if category is available)
        if (data.categoryId) {
          const availableTags = await prisma.tag.findMany({
            where: { categoryId: data.categoryId },
            select: { id: true, key: true, name_en: true },
          });

          if (availableTags.length > 0) {
            const metadata = await generateSearchMetadata({
              name:
                multilingualFields.name_en || multilingualFields.name_ru || "",
              description: multilingualFields.description_en || null,
              categoryId: data.categoryId,
              availableTags,
            });

            if (metadata.tagIds.length > 0) {
              finalTagIds = Array.from(
                new Set([...finalTagIds, ...metadata.tagIds])
              );
              logger.info("AI suggested tags", {
                sellerId: user.userId,
                tagIds: metadata.tagIds,
              });
            }

            if (metadata.keywords.length > 0) {
              aiKeywords = metadata.keywords;
              logger.info("AI extracted keywords", {
                sellerId: user.userId,
                keywords: metadata.keywords,
              });
            }

            if (metadata.productType) {
              aiProductType = metadata.productType;
            }

            if (metadata.brand) {
              aiBrand = metadata.brand;
            }
          }
        }
      } catch (error) {
        logger.warn(
          "Auto-translation or AI tagging failed, proceeding without it",
          {
            sellerId: user.userId,
            error,
          }
        );
      }
    }
  }

  try {
    const product = await prisma.$transaction(async (tx) => {
      // Destructure to separate priceTiers and non-DB fields from product data
      const {
        priceTiers,
        autoTranslate,
        tagIds, // Separate from productData
        // Remove legacy fields that are now handled via multilingual
        name,
        description,
        detailDescription,
        ...productData
      } = data;

      const newProduct = await tx.product.create({
        data: {
          ...productData,
          ...multilingualFields,
          name:
            multilingualFields.name_en ||
            multilingualFields.name_ru ||
            multilingualFields.name_am ||
            "",
          description:
            multilingualFields.description_en ||
            multilingualFields.description_ru ||
            multilingualFields.description_am,
          detailDescription:
            multilingualFields.detailDescription_en ||
            multilingualFields.detailDescription_ru ||
            multilingualFields.detailDescription_am,
          shopId: shop.id,
          status: data.status || ProductStatus.DRAFT,
          keywords: aiKeywords,
          productType: aiProductType,
          brand: productData.brand || aiBrand,
          searchTokens: buildSearchTokens({
            name_en: multilingualFields.name_en,
            name_ru: multilingualFields.name_ru,
            name_am: multilingualFields.name_am,
            description_en: multilingualFields.description_en,
            description_ru: multilingualFields.description_ru,
            description_am: multilingualFields.description_am,
            brand: productData.brand || aiBrand,
            productType: aiProductType,
            keywords: aiKeywords,
            sku: productData.sku,
          }),
        },
        include: {
          category: {
            select: {
              id: true,
              key: true,
              name_en: true,
              name_ru: true,
              name_am: true,
            },
          },
          subcategory: {
            select: {
              id: true,
              key: true,
              name_en: true,
              name_ru: true,
              name_am: true,
            },
          },
          subSubcategory: {
            select: {
              id: true,
              key: true,
              name_en: true,
              name_ru: true,
              name_am: true,
            },
          },
        },
      });

      // Create price tiers separately if provided
      if (priceTiers && priceTiers.length > 0) {
        await tx.priceTier.createMany({
          data: priceTiers.map((tier) => ({
            productId: newProduct.id,
            minQuantity: tier.minQuantity,
            maxQuantity: tier.maxQuantity ?? null,
            price: tier.price,
          })),
        });
      }

      // Create product tags if provided or suggested
      if (finalTagIds.length > 0) {
        await tx.productTag.createMany({
          data: finalTagIds.map((tagId) => ({
            productId: newProduct.id,
            tagId,
          })),
        });
      }

      return newProduct;
    });

    logger.info("Product created", {
      productId: product.id,
      sellerId: user.userId,
      shopId: shop.id,
      name: product.name,
      sku: product.sku,
    });

    return createdResponse({
      id: product.id,
      name: product.name,
      name_en: product.name_en,
      name_ru: product.name_ru,
      name_am: product.name_am,
      sku: product.sku,
      status: product.status,
      message: "Product created successfully",
    });
  } catch (error) {
    logger.error("Failed to create product", {
      sellerId: user.userId,
      shopId: shop.id,
      error,
    });
    throw error;
  }
}
