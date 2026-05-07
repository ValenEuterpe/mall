import { Prisma } from "@/prisma/generated/client";

export const FAVORITE_WITH_PRODUCT: Prisma.FavoriteSelect = {
  id: true,
  productId: true,
  createdAt: true,
  product: {
    select: {
      id: true,
      name: true,
      name_en: true,
      name_ru: true,
      name_am: true,
      description: true,
      basePrice: true,
      stockQuantity: true,
      images: true,
      brand: true,
      sku: true,
      status: true,
      isActive: true,
      shop: {
        select: {
          id: true,
          fullCode: true,
          shopName: true,
          venue: true,
          building: true,
          floor: true,
        },
      },
      category: {
        select: {
          id: true,
          name_en: true,
          name_ru: true,
          name_am: true,
        },
      },
    },
  },
};
