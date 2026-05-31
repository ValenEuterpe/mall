import { Prisma } from "@/prisma/generated/client";
import { SELLER_DETAIL_SELECT } from "../selects";

export function transformSellerForDetail(
  seller: Prisma.SellerGetPayload<{ select: typeof SELLER_DETAIL_SELECT }>
) {
  // Calculate statistics
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
    verification: {
      isVerified: seller.isVerified,
    },
    status: {
      isActive: seller.isActive,
      hasRegistered: seller.password !== null,
    },
    shops: seller.shops.map((shop) => ({
      id: shop.id,
      fullCode: shop.fullCode,
      shopName: shop.shopName,
      location: {
        venue: shop.venue,
        building: shop.building,
        floor: shop.floor,
      },
      contacts: shop.contacts,
      productsCount: shop._count.products,
      isActive: shop.isActive,
    })),
    stats: {
      shopsCount: seller.shops.length,
      totalProducts,
    },
    timestamps: {
      invitedAt: seller.invitedAt,
      lastLoginAt: seller.lastLoginAt,
      createdAt: seller.createdAt,
      updatedAt: seller.updatedAt,
    },
  };
}
