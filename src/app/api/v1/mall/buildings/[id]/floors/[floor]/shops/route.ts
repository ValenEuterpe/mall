import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { successResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * GET /api/v1/mall/buildings/[id]/floors/[floor]/shops
 * Get all shops for a specific floor
 */
async function getFloorShopsHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; floor: string }> }
): Promise<NextResponse> {
  const { id: buildingId, floor: floorId } = await params;

  // Check floor exists and belongs to building
  const floor = await prisma.floor.findFirst({
    where: {
      id: floorId,
      buildingId,
    },
  });

  if (!floor) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FLOOR_NOT_FOUND",
          message: "Floor not found in this building",
        },
      },
      { status: 404 }
    );
  }

  // Get all shops on this floor
  const shops = await prisma.shop.findMany({
    where: { floorId },
    orderBy: { shopNumber: "asc" },
    select: {
      id: true,
      fullCode: true,
      shopNumber: true,
      shopName: true,
      svgId: true,
      isActive: true,
      sellerId: true,
      seller: {
        select: {
          id: true,
          email: true,
          businessName: true,
        },
      },
    },
  });

  return successResponse(shops);
}

// ============================================================================
// EXPORTS
// ============================================================================

export const GET = withMiddleware(getFloorShopsHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  skipRateLimitForRoles: ["MALL_OWNER"],
});
