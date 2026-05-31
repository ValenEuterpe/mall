import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { successResponse, createdResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const createBuildingSchema = z.object({
  venueId: z.string().min(1, "Venue ID is required"),
  name: z.string().min(1).max(200),
  code: z
    .string()
    .min(1)
    .max(20)
    .regex(/^B\d+$/i, "Code must be in format B1, B2, etc.")
    .optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  rotation: z.number().min(0).max(360).default(0),
  scale: z.number().min(0.1).max(10).default(1),
});

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * GET /api/v1/mall/buildings
 * List all buildings for the mall
 */
async function listBuildingsHandler(_req: NextRequest): Promise<NextResponse> {
  // Get the mall first
  const mall = await prisma.mall.findFirst();
  if (!mall) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MALL_NOT_FOUND",
          message: "Mall must be configured first",
        },
      },
      { status: 404 }
    );
  }

  const buildings = await prisma.building.findMany({
    where: { mallId: mall.id },
    include: {
      floors: {
        orderBy: { number: "asc" },
        select: {
          id: true,
          number: true,
          label: true,
          code: true,
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
      },
    },
    orderBy: { code: "asc" },
  });

  return successResponse(buildings);
}

/**
 * POST /api/v1/mall/buildings
 * Create a new building within a venue
 */
async function createBuildingHandler(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const validated = createBuildingSchema.parse(body);

  // Check venue exists and get its mall
  const venue = await prisma.venue.findUnique({
    where: { id: validated.venueId },
    include: { mall: true },
  });

  if (!venue) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VENUE_NOT_FOUND",
          message: "Venue not found. Please create a venue first.",
        },
      },
      { status: 404 }
    );
  }

  // Auto-generate code if not provided (B1, B2, B3, etc.)
  let buildingCode = validated.code?.toUpperCase();
  if (!buildingCode) {
    const existingBuildings = await prisma.building.findMany({
      where: { mallId: venue.mallId },
      select: { code: true },
    });
    const existingNumbers = existingBuildings
      .map((b) => {
        const match = b.code.match(/^B(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);
    const nextNumber =
      existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    buildingCode = `B${nextNumber}`;
  }

  // Check for duplicate code within the mall
  const existingCode = await prisma.building.findFirst({
    where: {
      mallId: venue.mallId,
      code: buildingCode,
    },
  });

  if (existingCode) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DUPLICATE_CODE",
          message: `Building with code ${buildingCode} already exists`,
        },
      },
      { status: 409 }
    );
  }

  // Use venue's coordinates if not provided
  const latitude = validated.latitude ?? venue.latitude;
  const longitude = validated.longitude ?? venue.longitude;

  const building = await prisma.building.create({
    data: {
      mallId: venue.mallId,
      venueId: venue.id,
      name: validated.name,
      code: buildingCode,
      latitude,
      longitude,
      rotation: validated.rotation,
      scale: validated.scale,
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

  return createdResponse(building, "Building created successfully");
}

// ============================================================================
// EXPORTS
// ============================================================================

export const GET = withMiddleware(listBuildingsHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
});

export const POST = withMiddleware(createBuildingHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
});
