import { Prisma } from "@/prisma/generated/client";

import { PRODUCT_LIST_SELECT } from "./selects";

export type SellerProductListItem = ReturnType<typeof transformProductForSeller>;

export function transformProductForSeller(
    product: Prisma.ProductGetPayload<{ select: typeof PRODUCT_LIST_SELECT }>
) {
    return {
        id: product.id,
        name: product.name,
        description: product.description,
        pricing: {
            basePrice: product.basePrice,
            // NOTE: `Product` model does not have `salePrice`.
            // Discounts are represented via the `discounts` relation.
        },
        inventory: {
            stockQuantity: product.stockQuantity,
            inStock: product.stockQuantity > 0,
            sku: product.sku,
            barcode: product.barcode,
        },
        images: product.images,
        brand: product.brand,
        status: product.status,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        discounts: product.discounts.map((d) => ({
            id: d.id,
            name: d.name,
            name_en: d.name_en,
            name_ru: d.name_ru,
            name_am: d.name_am,
            discountType: d.discountType,
            discountValue: Number(d.discountValue),
            startDate: d.startDate?.toISOString() ?? null,
            endDate: d.endDate?.toISOString() ?? null,
            isActive: d.isActive,
        })),
        stats: {
            viewCount: product.viewCount,
            priceTiersCount: product._count.priceTiers,
            discountsCount: product._count.discounts,
        },
        category: product.category
            ? {
                  id: product.category.id,
                  key: product.category.key,
                  name: {
                      en: product.category.name_en,
                      ru: product.category.name_ru,
                  },
              }
            : null,
        subcategory: product.subcategory
            ? {
                  id: product.subcategory.id,
                  key: product.subcategory.key,
                  name: {
                      en: product.subcategory.name_en,
                      ru: product.subcategory.name_ru,
                  },
              }
            : null,
        timestamps: {
            createdAt: product.createdAt,
            updatedAt: product.lastUpdated,
        },
    };
}
