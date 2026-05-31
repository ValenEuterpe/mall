import { Prisma } from "@/prisma/generated/client";

import { MAP_SHOP_SELECT } from "../selects";

export function transformShopForMap(
  shop: Prisma.ShopGetPayload<{ select: typeof MAP_SHOP_SELECT }>
) {
  return {
    id: shop.id,
    shopNumber: shop.shopNumber,
    fullCode: shop.fullCode,
    svgId: shop.svgId || null,
    shopName: shop.shopName,
    isVacant: !shop.sellerId,
    description: shop.description || null,
    imageUrl: shop.imageUrl || null,
    openingHours: (shop.openingHours as Record<string, string> | null) || null,
    contacts: shop.contacts.map((c) => ({
      type: c.type,
      value: c.value,
      label: c.label || null,
    })),
    shopType: shop.shopType
      ? {
          id: shop.shopType.id,
          key: shop.shopType.key,
          name_en: shop.shopType.name_en,
          name_ru: shop.shopType.name_ru,
          name_am: shop.shopType.name_am,
          icon: shop.shopType.icon || null,
          color: shop.shopType.color || null,
        }
      : null,
    seller: shop.seller
      ? {
          businessName: shop.seller.businessName,
          logoUrl: shop.seller.logoUrl,
          phone: shop.seller.phone || null,
          socialLinks:
            (shop.seller.socialLinks as Record<string, string> | null) || null,
        }
      : null,
  };
}
