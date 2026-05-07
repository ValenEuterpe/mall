/**
 * Product View Tracking API
 * 
 * POST /api/v1/products/[id]/view
 * 
 * Records a product view for analytics.
 * No authentication required (public endpoint).
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { successResponse, methodNotAllowed } from "@/lib/api/response";
import { analyticsRateLimiter, enforceRateLimit } from "@/lib/utils/rate-limit";

type RouteContext = {
    params: Promise<{ id: string }>;
};

/**
 * POST /api/v1/products/[id]/view
 * 
 * Records a view for a product. Updates both the aggregate viewCount
 * and creates a detailed ProductView record for analytics.
 */
export async function POST(
    request: NextRequest,
    context: RouteContext
): Promise<NextResponse> {
    const limited = enforceRateLimit(request, analyticsRateLimiter);
    if (limited) return limited.response;

    const { id } = await context.params;

    // Validate product exists
    const product = await prisma.product.findUnique({
        where: { id },
        select: { id: true },
    });

    if (!product) {
        return NextResponse.json(
            { success: false, error: { code: "NOT_FOUND", message: "Product not found" } },
            { status: 404 }
        );
    }

    // Get client info for analytics
    const userAgent = request.headers.get("user-agent") || undefined;
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               request.headers.get("x-real-ip") ||
               undefined;

    // Record the view in a transaction
    await prisma.$transaction([
        // Increment aggregate counter
        prisma.product.update({
            where: { id },
            data: { viewCount: { increment: 1 } },
        }),
        // Create detailed view record
        prisma.productView.create({
            data: {
                productId: id,
                userAgent,
                ipAddress: ip,
            },
        }),
    ]);

    return successResponse({ recorded: true });
}

// Only POST is allowed
export const GET = () => methodNotAllowed(["POST"]);
export const PUT = () => methodNotAllowed(["POST"]);
export const DELETE = () => methodNotAllowed(["POST"]);
