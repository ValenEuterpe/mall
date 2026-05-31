import { Prisma } from "@/prisma/generated/client";

export const SHOP_DETAIL_SELECT = {
  id: true,
  venue: true,
  building: true,
  floor: true,
  shopNumber: true,
  fullCode: true,
  shopName: true,
  description: true,
  imageUrl: true,
  svgId: true,
  isActive: true,
  openingHours: true,
  createdAt: true,
  updatedAt: true,
  sellerId: true,
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
  seller: {
    select: {
      id: true,
      email: true,
      businessName: true,
      contactPerson: true,
      phone: true,
      description: true,
      logoUrl: true,
      socialLinks: true,
      isVerified: true,
      createdAt: true,
    },
  },
  products: {
    select: {
      id: true,
      name: true,
      status: true,
      isActive: true,
      basePrice: true,
      stockQuantity: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" as const },
    take: 20,
  },
  contacts: {
    select: {
      id: true,
      type: true,
      value: true,
      label: true,
    },
  },
  _count: {
    select: {
      products: true,
    },
  },
} satisfies Prisma.ShopSelect;
