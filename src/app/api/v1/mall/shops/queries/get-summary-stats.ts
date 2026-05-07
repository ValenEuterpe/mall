import prisma from "@/lib/db/prisma";
import { Prisma } from "@/prisma/generated/client";
import { ShopSummary } from "../types";

export async function getSummaryStats(
    baseWhere: Prisma.ShopWhereInput
): Promise<ShopSummary> {
    const [total, vacant, occupied, byVenue, byFloor, withProducts] =
        await Promise.all([
            // Total count
            prisma.shop.count({ where: baseWhere }),

            // Vacant count
            prisma.shop.count({
                where: { ...baseWhere, sellerId: null },
            }),

            // Occupied count
            prisma.shop.count({
                where: { ...baseWhere, sellerId: { not: null } },
            }),

            // Group by venue
            prisma.shop.groupBy({
                by: ["venue"],
                where: baseWhere,
                _count: { id: true },
            }),

            // Group by floor
            prisma.shop.groupBy({
                by: ["floor"],
                where: { ...baseWhere, floor: { not: null } },
                _count: { id: true },
            }),

            // With products count
            prisma.shop.count({
                where: {
                    ...baseWhere,
                    products: { some: {} },
                },
            }),
        ]);

    return {
        total,
        vacant,
        occupied,
        byVenue: Object.fromEntries(byVenue.map((v) => [v.venue, v._count.id])),
        byFloor: Object.fromEntries(
            byFloor
                .filter((f) => f.floor !== null)
                .map((f) => [f.floor!, f._count.id])
        ),
        withProducts,
    };
}