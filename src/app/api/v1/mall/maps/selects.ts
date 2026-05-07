import { Prisma } from "@/prisma/generated/client";

export const MAP_SHOP_SELECT = {
    id: true,
    shopNumber: true,
    fullCode: true,
    svgId: true,
    shopName: true,
    sellerId: true,
    description: true,
    imageUrl: true,
    openingHours: true,
    contacts: {
        select: {
            type: true,
            value: true,
            label: true,
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
        },
    },
    seller: {
        select: {
            businessName: true,
            logoUrl: true,
            isVerified: true,
            phone: true,
            socialLinks: true,
        },
    },
} satisfies Prisma.ShopSelect;