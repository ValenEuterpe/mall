import { Prisma } from "@/prisma/generated/client";
import { SHOP_DETAIL_SELECT } from "./selects";

export function transformShopForDetail(
    shop: Prisma.ShopGetPayload<{ select: typeof SHOP_DETAIL_SELECT }>
) {
    // Calculate product statistics
    const productStats = {
        total: shop._count.products,
        published: shop.products.filter((p) => p.status === "PUBLISHED").length,
        draft: shop.products.filter((p) => p.status === "DRAFT").length,
        active: shop.products.filter((p) => p.isActive).length,
    };

    return {
        id: shop.id,
        code: shop.fullCode,
        name: shop.shopName,
        description: shop.description,
        imageUrl: shop.imageUrl,
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
        workingHours: shop.openingHours,
        seller: shop.seller
            ? {
                id: shop.seller.id,
                email: shop.seller.email,
                businessName: shop.seller.businessName,
                contactPerson: shop.seller.contactPerson,
                phone: shop.seller.phone,
                description: shop.seller.description,
                logoUrl: shop.seller.logoUrl,
                socialLinks: shop.seller.socialLinks,
                verification: {
                    isVerified: shop.seller.isVerified,
                },
                joinedAt: shop.seller.createdAt,
            }
            : null,
        products: {
            items: shop.products.map((p) => ({
                id: p.id,
                name: p.name,
                status: p.status,
                isActive: p.isActive,
                basePrice: p.basePrice,
                stockQuantity: p.stockQuantity,
                createdAt: p.createdAt,
            })),
            stats: productStats,
        },
        contacts: shop.contacts,
        timestamps: {
            createdAt: shop.createdAt,
            updatedAt: shop.updatedAt,
        },
    };
}