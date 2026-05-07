import { Prisma } from "@/prisma/generated/client";
import { ShopFilters } from "../types";

export function buildWhereClause(
    filters: ShopFilters,
    searchCondition: Prisma.ShopWhereInput
): Prisma.ShopWhereInput {
    const where: Prisma.ShopWhereInput = {
        ...searchCondition,
    };

    // Active filter (default to true if not specified)
    if (filters.active === "false") {
        where.isActive = false;
    } else if (filters.active === "true" || filters.active === undefined) {
        where.isActive = true;
    }

    // Venue filter
    if (filters.venue) {
        where.venue = {
            equals: filters.venue,
            mode: "insensitive",
        };
    }

    // Building filter
    if (filters.building) {
        where.building = {
            equals: filters.building,
            mode: "insensitive",
        };
    }

    // Floor filter
    if (filters.floor) {
        where.floor = {
            equals: filters.floor,
            mode: "insensitive",
        };
    }

    // Shop type filter
    if (filters.shopType) {
        where.shopType = {
            key: filters.shopType,
        };
    }

    // Vacancy filter
    if (filters.vacant === "true") {
        where.sellerId = null;
    } else if (filters.vacant === "false") {
        where.sellerId = { not: null };
    }

    // Verified seller filter
    if (filters.verified === "true") {
        where.seller = {
            isVerified: true,
        };
    } else if (filters.verified === "false") {
        where.seller = {
            isVerified: false,
        };
    }

    // Has products filter
    if (filters.hasProducts === "true") {
        where.products = {
            some: {},
        };
    } else if (filters.hasProducts === "false") {
        where.products = {
            none: {},
        };
    }

    return where;
}