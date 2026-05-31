import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { successResponse, createdResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const createFloorSchema = z.object({
  number: z.number().int().min(-10).max(100), // Allow negative for basements (-1, -2, etc.)
  label: z.string().max(100).optional(),
  code: z.string().min(1).max(20).optional(), // Auto-generated based on number
});

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * GET /api/v1/mall/buildings/[id]/floors
 * List all floors for a building
 */
async function listFloorsHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: buildingId } = await params;

  // Check building exists
  const building = await prisma.building.findUnique({
    where: { id: buildingId },
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

  const floors = await prisma.floor.findMany({
    where: { buildingId },
    orderBy: { number: "asc" },
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

  return successResponse(floors);
}

/**
 * POST /api/v1/mall/buildings/[id]/floors
 * Create a new floor in a building
 */
async function createFloorHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: buildingId } = await params;
  const body = await req.json();
  const validated = createFloorSchema.parse(body);

  // Check building exists
  const building = await prisma.building.findUnique({
    where: { id: buildingId },
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

  // Generate code if not provided
  // For negative floors (basements), use B1, B2 format; for positive, use F1, F2
  let code = validated.code?.toUpperCase();
  if (!code) {
    if (validated.number < 0) {
      code = `B${Math.abs(validated.number)}`; // Basement 1, Basement 2, etc.
    } else if (validated.number === 0) {
      code = "G"; // Ground floor
    } else {
      code = `F${validated.number}`; // Floor 1, Floor 2, etc.
    }
  }

  // Check for duplicate floor number or code
  const existingFloor = await prisma.floor.findFirst({
    where: {
      buildingId,
      OR: [{ number: validated.number }, { code }],
    },
  });

  if (existingFloor) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DUPLICATE_FLOOR",
          message:
            existingFloor.number === validated.number
              ? `Floor ${validated.number} already exists in this building`
              : `Floor with code ${code} already exists in this building`,
        },
      },
      { status: 409 }
    );
  }

  const floor = await prisma.floor.create({
    data: {
      buildingId,
      number: validated.number,
      label: validated.label,
      code,
    },
    include: {
      floorMap: true,
      _count: { select: { shops: true } },
    },
  });

  return createdResponse(floor, "Floor created successfully");
}

// ============================================================================
// EXPORTS
// ============================================================================

export const GET = withMiddleware(listFloorsHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  skipRateLimitForRoles: ["MALL_OWNER"],
});

export const POST = withMiddleware(createFloorHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  skipRateLimitForRoles: ["MALL_OWNER"],
});
