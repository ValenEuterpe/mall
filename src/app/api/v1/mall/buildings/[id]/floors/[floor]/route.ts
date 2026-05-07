import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { successResponse, noContentResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const updateFloorSchema = z.object({
  label: z.string().max(100).optional(),
  code: z.string().min(1).max(20).regex(/^F\d+$/i, "Code must be in format F1, F2, etc.").optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  rotation: z.number().min(0).max(360).optional(),
  scale: z.number().min(0.1).max(10).optional(),
});

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * GET /api/v1/mall/buildings/[id]/floors/[floor]
 * Get a specific floor by ID or floor number
 */
async function getFloorHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; floor: string }> }
): Promise<NextResponse> {
  const { id: buildingId, floor: floorParam } = await params;

  // Try to find by ID first, then by floor number
  let floorRecord = await prisma.floor.findFirst({
    where: {
      id: floorParam,
      buildingId,
    },
    include: {
      floorMap: {
        select: {
          id: true,
          svgUrl: true,
          shopIds: true,
        },
      },
      _count: {
        select: { shops: true },
      },
    },
  });

  // If not found by ID, try by floor number
  if (!floorRecord) {
    const floorNumber = parseInt(floorParam, 10);
    if (!isNaN(floorNumber)) {
      floorRecord = await prisma.floor.findFirst({
        where: {
          buildingId,
          number: floorNumber,
        },
        include: {
          floorMap: {
            select: {
              id: true,
              svgUrl: true,
              shopIds: true,
            },
          },
          _count: {
            select: { shops: true },
          },
        },
      });
    }
  }

  if (!floorRecord) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FLOOR_NOT_FOUND",
          message: "Floor not found",
        },
      },
      { status: 404 }
    );
  }

  return successResponse(floorRecord);
}

/**
 * PUT /api/v1/mall/buildings/[id]/floors/[floor]
 * Update a floor
 */
async function updateFloorHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; floor: string }> }
): Promise<NextResponse> {
  const { id: buildingId, floor: floorParam } = await params;
  const body = await req.json();
  const validated = updateFloorSchema.parse(body);

  // Find floor by ID or number
  let existing = await prisma.floor.findFirst({
    where: {
      id: floorParam,
      buildingId,
    },
  });

  if (!existing) {
    const floorNumber = parseInt(floorParam, 10);
    if (!isNaN(floorNumber)) {
      existing = await prisma.floor.findFirst({
        where: {
          buildingId,
          number: floorNumber,
        },
      });
    }
  }

  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FLOOR_NOT_FOUND",
          message: "Floor not found",
        },
      },
      { status: 404 }
    );
  }

  // Check for duplicate code if updating
  if (validated.code && validated.code.toUpperCase() !== existing.code) {
    const duplicateCode = await prisma.floor.findFirst({
      where: {
        buildingId,
        code: validated.code.toUpperCase(),
        NOT: { id: existing.id },
      },
    });

    if (duplicateCode) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_CODE",
            message: `Floor with code ${validated.code} already exists`,
          },
        },
        { status: 409 }
      );
    }
  }

  const updatedFloor = await prisma.floor.update({
    where: { id: existing.id },
    data: {
      label: validated.label,
      ...(validated.code && { code: validated.code.toUpperCase() }),
      ...(validated.latitude !== undefined && { latitude: validated.latitude }),
      ...(validated.longitude !== undefined && { longitude: validated.longitude }),
      ...(validated.rotation !== undefined && { rotation: validated.rotation }),
      ...(validated.scale !== undefined && { scale: validated.scale }),
    },
    include: {
      floorMap: true,
      _count: { select: { shops: true } },
    },
  });

  return successResponse(updatedFloor, { message: "Floor updated successfully" });
}

/**
 * DELETE /api/v1/mall/buildings/[id]/floors/[floor]
 * Delete a floor (and its floor map if exists)
 */
async function deleteFloorHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; floor: string }> }
): Promise<NextResponse> {
  const { id: buildingId, floor: floorParam } = await params;

  // Find floor by ID or number
  let existing = await prisma.floor.findFirst({
    where: {
      id: floorParam,
      buildingId,
    },
    include: {
      _count: { select: { shops: true } },
    },
  });

  if (!existing) {
    const floorNumber = parseInt(floorParam, 10);
    if (!isNaN(floorNumber)) {
      existing = await prisma.floor.findFirst({
        where: {
          buildingId,
          number: floorNumber,
        },
        include: {
          _count: { select: { shops: true } },
        },
      });
    }
  }

  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FLOOR_NOT_FOUND",
          message: "Floor not found",
        },
      },
      { status: 404 }
    );
  }

  // Check if floor has shops
  if (existing._count.shops > 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FLOOR_HAS_SHOPS",
          message: `Cannot delete floor with ${existing._count.shops} shop(s). Remove all shops first.`,
        },
      },
      { status: 409 }
    );
  }

  // Delete floor (FloorMap will cascade delete)
  await prisma.floor.delete({
    where: { id: existing.id },
  });

  return noContentResponse();
}

// ============================================================================
// EXPORTS
// ============================================================================

export const GET = withMiddleware(getFloorHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
});

export const PUT = withMiddleware(updateFloorHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
});

export const DELETE = withMiddleware(deleteFloorHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
});
