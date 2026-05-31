import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { successResponse, createdResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const createVenueSchema = z.object({
  name: z.string().min(1).max(200),
  code: z
    .string()
    .min(1)
    .max(20)
    .regex(/^V\d+$/i, "Code must be in format V1, V2, etc.")
    .optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * GET /api/v1/mall/venues
 * List all venues for the mall
 */
async function listVenuesHandler(_req: NextRequest): Promise<NextResponse> {
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

  const venues = await prisma.venue.findMany({
    where: { mallId: mall.id },
    include: {
      buildings: {
        orderBy: { code: "asc" },
        include: {
          floors: {
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
          },
        },
      },
    },
    orderBy: { code: "asc" },
  });

  return successResponse(venues);
}

/**
 * POST /api/v1/mall/venues
 * Create a new venue
 */
async function createVenueHandler(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const validated = createVenueSchema.parse(body);

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

  // Auto-generate code if not provided (V1, V2, V3, etc.)
  let venueCode = validated.code?.toUpperCase();
  if (!venueCode) {
    const existingVenues = await prisma.venue.findMany({
      where: { mallId: mall.id },
      select: { code: true },
    });
    const existingNumbers = existingVenues
      .map((v) => {
        const match = v.code.match(/^V(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);
    const nextNumber =
      existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    venueCode = `V${nextNumber}`;
  }

  // Check for duplicate code
  const existingCode = await prisma.venue.findFirst({
    where: {
      mallId: mall.id,
      code: venueCode,
    },
  });

  if (existingCode) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DUPLICATE_CODE",
          message: `Venue with code ${venueCode} already exists`,
        },
      },
      { status: 409 }
    );
  }

  const venue = await prisma.venue.create({
    data: {
      mallId: mall.id,
      name: validated.name,
      code: venueCode,
      latitude: validated.latitude,
      longitude: validated.longitude,
    },
    include: {
      buildings: {
        include: {
          floors: {
            orderBy: { number: "asc" },
          },
        },
      },
    },
  });

  return createdResponse(venue, "Venue created successfully");
}

// ============================================================================
// EXPORTS
// ============================================================================

export const GET = withMiddleware(listVenuesHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
});

export const POST = withMiddleware(createVenueHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
});
