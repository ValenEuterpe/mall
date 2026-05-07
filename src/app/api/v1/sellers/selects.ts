import { Prisma } from "@/prisma/generated/client";

/**
 * NOTE: These selects must stay aligned with `prisma/schema.prisma`.
 * Seller model does NOT contain `registeredAt` or `verifiedAt`.
 * "Registration" in this codebase is inferred by whether `password` is set.
 */
export const SELLER_LIST_SELECT = {
    id: true,
    email: true,
    password: true,

    businessName: true,
    contactPerson: true,
    phone: true,
    description: true,
    logoUrl: true,
    socialLinks: true,

    isVerified: true,
    isActive: true,
    invitedAt: true,
    lastLoginAt: true,

    shops: {
        where: { isActive: true },
        select: {
            id: true,
            fullCode: true,
            shopName: true,
            floor: true,
            building: true,
            venue: true,
            _count: {
                select: {
                    products: true,
                },
            },
        },
    },
    _count: {
        select: {
            shops: true,
        },
    },
} satisfies Prisma.SellerSelect;

export const SELLER_DETAIL_SELECT = {
    id: true,
    email: true,
    password: true,

    businessName: true,
    contactPerson: true,
    phone: true,
    description: true,
    logoUrl: true,
    socialLinks: true,

    isVerified: true,
    isActive: true,
    invitedAt: true,
    lastLoginAt: true,

    createdAt: true,
    updatedAt: true,

    shops: {
        select: {
            id: true,
            fullCode: true,
            shopName: true,
            floor: true,
            building: true,
            venue: true,
            isActive: true,
            contacts: true,
            _count: {
                select: {
                    products: true,
                },
            },
        },
    },
} satisfies Prisma.SellerSelect;
