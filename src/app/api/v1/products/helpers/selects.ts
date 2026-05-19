import { Prisma } from "@/prisma/generated/client";

/** Prisma where clause for currently-active discounts (handles null dates). */
export function activeDiscountWhere() {
  const now = new Date();
  return {
    isActive: true,
    AND: [
      { OR: [{ startDate: null }, { startDate: { lte: now } }] },
      { OR: [{ endDate: null }, { endDate: { gte: now } }] },
    ],
  };
}

export function getProductListSelect() {
  return {
    id: true,
    name: true,
    name_en: true,
    name_ru: true,
    name_am: true,
    description: true,
    description_en: true,
    description_ru: true,
    description_am: true,
    basePrice: true,
    stockQuantity: true,
    images: true,
    brand: true,
    sku: true,
    isFeatured: true,
    createdAt: true,
    shop: {
      select: {
        id: true,
        fullCode: true,
        shopName: true,
        svgId: true,
        seller: {
          select: {
            businessName: true,
          },
        },
      },
    },
    category: {
      select: {
        id: true,
        key: true,
        name_en: true,
        name_ru: true,
      },
    },
    subcategory: {
      select: {
        id: true,
        key: true,
        name_en: true,
        name_ru: true,
      },
    },
    productTags: {
      select: {
        tag: {
          select: {
            id: true,
            key: true,
            name_en: true,
            name_ru: true,
            name_am: true,
          },
        },
      },
    },
    discounts: {
      where: activeDiscountWhere(),
      take: 1,
      select: {
        id: true,
        discountValue: true,
        discountType: true,
      },
    },
  } satisfies Prisma.ProductSelect;
}

/** @deprecated Use getProductListSelect() instead */
export const PRODUCT_LIST_SELECT = getProductListSelect();

export function getProductDetailSelect() {
  return {
    id: true,
    name: true,
    name_en: true,
    name_ru: true,
    name_am: true,
    description: true,
    description_en: true,
    description_ru: true,
    description_am: true,
    detailDescription: true,
    basePrice: true,
    stockQuantity: true,
    images: true,
    brand: true,
    barcode: true,
    isFeatured: true,
    status: true,
    createdAt: true,
    lastUpdated: true,
    shop: {
      select: {
        id: true,
        fullCode: true,
        shopName: true,
        floor: true,
        building: true,
        venue: true,
        svgId: true,
        openingHours: true,
        seller: {
          select: {
            id: true,
            businessName: true,
            phone: true,
            socialLinks: true,
            logoUrl: true,
            description: true,
          },
        },
        contacts: {
          select: {
            id: true,
            type: true,
            value: true,
            label: true,
          },
        },
      },
    },
    category: {
      select: {
        id: true,
        key: true,
        name_en: true,
        name_ru: true,
      },
    },
    subcategory: {
      select: {
        id: true,
        key: true,
        name_en: true,
        name_ru: true,
      },
    },
    productTags: {
      select: {
        tag: {
          select: {
            id: true,
            key: true,
            name_en: true,
            name_ru: true,
            name_am: true,
          },
        },
      },
    },
    priceTiers: {
      orderBy: { minQuantity: "asc" as const },
      select: {
        id: true,
        minQuantity: true,
        maxQuantity: true,
        price: true,
      },
    },
    discounts: {
      where: activeDiscountWhere(),
      select: {
        id: true,
        discountType: true,
        discountValue: true,
        startDate: true,
        endDate: true,
      },
    },
  } satisfies Prisma.ProductSelect;
}

/** @deprecated Use getProductDetailSelect() instead */
export const PRODUCT_DETAIL_SELECT = getProductDetailSelect();
