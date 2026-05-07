import { Prisma } from "@/prisma/generated/client";

export const EXPORT_SELECT = {
    name: true,
    description: true,
    basePrice: true,
    stockQuantity: true,
    sku: true,
    barcode: true,
    brand: true,
    images: true,
    status: true,
    isActive: true,
    isFeatured: true,
    createdAt: true,
    lastUpdated: true,
    category: {
        select: {
            name_en: true,
            key: true,
        },
    },
    subcategory: {
        select: {
            name_en: true,
            key: true,
        },
    },
} satisfies Prisma.ProductSelect;