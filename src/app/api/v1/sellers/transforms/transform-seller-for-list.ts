import { Prisma } from "@/prisma/generated/client";
import { SELLER_LIST_SELECT } from "../selects";

export function transformSellerForList(
  seller: Prisma.SellerGetPayload<{ select: typeof SELLER_LIST_SELECT }>
) {
  // Calculate total products across all shops
  const totalProducts = seller.shops.reduce(
    (sum, shop) => sum + shop._count.products,
    0
  );

  return {
    id: seller.id,
    email: seller.email,
    businessName: seller.businessName,
    contactPerson: seller.contactPerson,
    phone: seller.phone,
    description: seller.description,
    logoUrl: seller.logoUrl,
    socialLinks: seller.socialLinks,
    status: {
      isVerified: seller.isVerified,
      isActive: seller.isActive,
      hasRegistered: seller.password !== null,
    },
    shops: seller.shops.map((shop) => ({
      id: shop.id,
      code: shop.fullCode,
      name: shop.shopName,
      location: {
        venue: shop.venue,
        building: shop.building,
        floor: shop.floor,
      },
      productsCount: shop._count.products,
    })),
    stats: {
      shopsCount: seller._count.shops,
      totalProducts,
    },
    timestamps: {
      invitedAt: seller.invitedAt,
      lastLoginAt: seller.lastLoginAt,
    },
  };
}
