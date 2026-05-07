import { Prisma } from "@/prisma/generated/client";



export const PRODUCT_LIST_SELECT = {
    id: true,
    name: true,
    description: true,
    basePrice: true,
    stockQuantity: true,
    images: true,
    brand: true,
    sku: true,
    barcode: true,
    status: true,
    isActive: true,
    isFeatured: true,
    viewCount: true,
    createdAt: true,
    lastUpdated: true,
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
    discounts: {
        where: { isActive: true },
        select: {
            id: true,
            name: true,
            name_en: true,
            name_ru: true,
            name_am: true,
            discountType: true,
            discountValue: true,
            startDate: true,
            endDate: true,
            isActive: true,
        },
        orderBy: { id: "desc" as const },
    },
    _count: {
        select: {
            priceTiers: true,
            discounts: true,
        },
    },
} satisfies Prisma.ProductSelect;