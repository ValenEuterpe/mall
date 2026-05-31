import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { successResponse, noContentResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const updateBuildingSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z
    .string()
    .min(1)
    .max(20)
    .regex(/^B\d+$/i, "Code must be in format B1, B2, etc.")
    .optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  rotation: z.number().min(0).max(360).optional(),
  scale: z.number().min(0.1).max(10).optional(),
});

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * GET /api/v1/mall/buildings/[id]
 * Get a single building with its floor maps
 */
async function getBuildingHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  const building = await prisma.building.findUnique({
    where: { id },
    include: {
      floors: {
        orderBy: { number: "asc" },
        include: {
          floorMap: true,
          _count: { select: { shops: true } },
        },
      },
    },
  });

  if (!building) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BUILDING_NOT_FOUND",
          message: "Building not found",
        },
      },
      { status: 404 }
    );
  }

  return successResponse(building);
}

/**
 * PUT /api/v1/mall/buildings/[id]
 * Update a building
 */
async function updateBuildingHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const body = await req.json();
  const validated = updateBuildingSchema.parse(body);

  // Check building exists
  const existing = await prisma.building.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BUILDING_NOT_FOUND",
          message: "Building not found",
        },
      },
      { status: 404 }
    );
  }

  // If code is being changed, check for duplicates
  if (validated.code && validated.code.toUpperCase() !== existing.code) {
    const duplicateCode = await prisma.building.findFirst({
      where: {
        mallId: existing.mallId,
        code: validated.code.toUpperCase(),
        id: { not: id },
      },
    });

    if (duplicateCode) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_CODE",
            message: `Building with code ${validated.code} already exists`,
          },
        },
        { status: 409 }
      );
    }
  }

  const building = await prisma.building.update({
    where: { id },
    data: {
      ...validated,
      code: validated.code?.toUpperCase(),
    },
    include: {
      floors: {
        orderBy: { number: "asc" },
        include: {
          floorMap: true,
          _count: { select: { shops: true } },
        },
      },
    },
  });

  return successResponse(building, {
    message: "Building updated successfully",
  });
}

/**
 * DELETE /api/v1/mall/buildings/[id]
 * Delete a building and all its floor maps
 */
async function deleteBuildingHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  const building = await prisma.building.findUnique({
    where: { id },
  });

  if (!building) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BUILDING_NOT_FOUND",
          message: "Building not found",
        },
      },
      { status: 404 }
    );
  }

  // Cascade delete will remove floor maps
  await prisma.building.delete({
    where: { id },
  });

  return noContentResponse();
}

// ============================================================================
// EXPORTS
// ============================================================================

export const GET = withMiddleware(getBuildingHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
});

export const PUT = withMiddleware(updateBuildingHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
});

export const DELETE = withMiddleware(deleteBuildingHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
});
