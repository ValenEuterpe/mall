import { Prisma } from "@/prisma/generated/client";

export const SHOP_LIST_SELECT = {
    id: true,
    venue: true,
    building: true,
    floor: true,
    shopNumber: true,
    fullCode: true,
    shopName: true,
    svgId: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    seller: {
        select: {
            id: true,
            email: true,
            businessName: true,
            contactPerson: true,
            phone: true,
            logoUrl: true,
            isVerified: true,
            createdAt: true,
        },
    },
    shopType: {
        select: {
            id: true,
            key: true,
            name_en: true,
            name_ru: true,
            name_am: true,
            icon: true,
            color: true,
            supportsProducts: true,
        },
    },
    contacts: {
        select: {
            id: true,
            type: true,
            value: true,
            label: true,
        },
        take: 5,
    },
    _count: {
        select: {
            products: true,
        },
    },
} satisfies Prisma.ShopSelect;