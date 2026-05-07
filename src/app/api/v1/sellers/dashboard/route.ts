/**
 * Seller Dashboard Stats API
 * 
 * GET /api/v1/sellers/dashboard
 * 
 * Returns dashboard statistics for the authenticated seller.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/db/prisma";
import { successResponse, methodNotAllowed } from "@/lib/api/response";
import { ProductStatus } from "@/prisma/generated/client";

/**
 * GET /api/v1/sellers/dashboard
 * 
 * Returns:
 * - Total products count
 * - Products by status (published, draft, archived)
 * - Total views (all time)
 * - Views this week
 * - Top viewed products
 */
export const GET = withAuth(
    async (request: NextRequest, { user }) => {
        // Get the seller's shops (a seller can have multiple shops)
        const seller = await prisma.seller.findUnique({
            where: { id: user.userId },
            select: { 
                id: true,
                shops: { select: { id: true } } 
            },
        });

        if (!seller || seller.shops.length === 0) {
            return NextResponse.json(
                { success: false, error: { code: "NO_SHOP", message: "Seller has no assigned shop" } },
                { status: 400 }
            );
        }

        // Get all shop IDs for this seller
        const shopIds = seller.shops.map(s => s.id);

        // Calculate date for "this week" (last 7 days)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // Run all queries in parallel for efficiency
        const [
            totalProducts,
            productsByStatus,
            totalViews,
            viewsThisWeek,
            topProducts,
            recentProducts,
        ] = await Promise.all([
            // Total products count
            prisma.product.count({
                where: { shopId: { in: shopIds } },
            }),

            // Products by status
            prisma.product.groupBy({
                by: ["status"],
                where: { shopId: { in: shopIds } },
                _count: { id: true },
            }),

            // Total views (sum of viewCount)
            prisma.product.aggregate({
                where: { shopId: { in: shopIds } },
                _sum: { viewCount: true },
            }),

            // Views this week (from ProductView table)
            prisma.productView.count({
                where: {
                    product: { shopId: { in: shopIds } },
                    viewedAt: { gte: oneWeekAgo },
                },
            }),

            // Top 5 most viewed products
            prisma.product.findMany({
                where: { shopId: { in: shopIds } },
                orderBy: { viewCount: "desc" },
                take: 5,
                select: {
                    id: true,
                    name: true,
                    name_en: true,
                    name_ru: true,
                    name_am: true,
                    sku: true,
                    viewCount: true,
                    status: true,
                    images: true,
                },
            }),

            // Recent products (last 5 created)
            prisma.product.findMany({
                where: { shopId: { in: shopIds } },
                orderBy: { createdAt: "desc" },
                take: 5,
                select: {
                    id: true,
                    name: true,
                    name_en: true,
                    sku: true,
                    status: true,
                    createdAt: true,
                },
            }),
        ]);

        // Transform productsByStatus into a more usable format
        const statusCounts: Record<string, number> = {
            [ProductStatus.PUBLISHED]: 0,
            [ProductStatus.DRAFT]: 0,
            [ProductStatus.ARCHIVED]: 0,
        };
        
        for (const item of productsByStatus) {
            statusCounts[item.status] = item._count.id;
        }

        return successResponse({
            overview: {
                totalProducts,
                publishedProducts: statusCounts[ProductStatus.PUBLISHED],
                draftProducts: statusCounts[ProductStatus.DRAFT],
                archivedProducts: statusCounts[ProductStatus.ARCHIVED],
                totalViews: totalViews._sum.viewCount || 0,
                viewsThisWeek,
            },
            topProducts: topProducts.map((p) => ({
                id: p.id,
                name: p.name_en || p.name_ru || p.name_am || p.name,
                sku: p.sku,
                viewCount: p.viewCount,
                status: p.status,
                thumbnail: p.images[0] || null,
            })),
            recentProducts: recentProducts.map((p) => ({
                id: p.id,
                name: p.name_en || p.name,
                sku: p.sku,
                status: p.status,
                createdAt: p.createdAt,
            })),
        });
    },
    { roles: ["SELLER"] }
);

// Only GET is allowed
export const POST = () => methodNotAllowed(["GET"]);
export const PUT = () => methodNotAllowed(["GET"]);
export const DELETE = () => methodNotAllowed(["GET"]);
