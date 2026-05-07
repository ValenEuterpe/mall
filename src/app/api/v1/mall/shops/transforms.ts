import { Prisma } from "@/prisma/generated/client";
import { SHOP_LIST_SELECT } from "./selects";

export function transformShopForList(
    shop: Prisma.ShopGetPayload<{ select: typeof SHOP_LIST_SELECT }>
) {
    return {
        id: shop.id,
        code: shop.fullCode,
        name: shop.shopName,
        location: {
            venue: shop.venue,
            building: shop.building,
            floor: shop.floor,
            number: shop.shopNumber,
            svgId: shop.svgId,
        },
        isActive: shop.isActive,
        isVacant: !shop.seller,
        type: shop.shopType
            ? {
                  id: shop.shopType.id,
                  key: shop.shopType.key,
                  name_en: shop.shopType.name_en,
                  name_ru: shop.shopType.name_ru,
                  name_am: shop.shopType.name_am,
                  icon: shop.shopType.icon,
                  color: shop.shopType.color,
                  supportsProducts: shop.shopType.supportsProducts,
              }
            : null,
        seller: shop.seller
            ? {
                id: shop.seller.id,
                email: shop.seller.email,
                businessName: shop.seller.businessName,
                contactPerson: shop.seller.contactPerson,
                phone: shop.seller.phone,
                logoUrl: shop.seller.logoUrl,
                isVerified: shop.seller.isVerified,
                joinedAt: shop.seller.createdAt,
            }
            : null,
        contacts: shop.contacts,
        stats: {
            productsCount: shop._count.products,
        },
        timestamps: {
            createdAt: shop.createdAt,
            updatedAt: shop.updatedAt,
        },
    };
}