import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { successResponse, noContentResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const updateVenueSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z
    .string()
    .min(1)
    .max(20)
    .regex(/^V\d+$/i, "Code must be in format V1, V2, etc.")
    .optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  rotation: z.number().min(0).max(360).optional(),
  scale: z.number().min(0.1).max(10).optional(),
  svgUrl: z.string().url().nullable().optional(),
  shopIds: z.array(z.string()).optional(),
});

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * GET /api/v1/mall/venues/[id]
 * Get a single venue
 */
async function getVenueHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  const venue = await prisma.venue.findUnique({
    where: { id },
  });

  if (!venue) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VENUE_NOT_FOUND",
          message: "Venue not found",
        },
      },
      { status: 404 }
    );
  }

  return successResponse(venue);
}

/**
 * PUT /api/v1/mall/venues/[id]
 * Update a venue
 */
async function updateVenueHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const body = await req.json();
  const validated = updateVenueSchema.parse(body);

  // Check venue exists
  const existing = await prisma.venue.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VENUE_NOT_FOUND",
          message: "Venue not found",
        },
      },
      { status: 404 }
    );
  }

  // If code is being changed, check for duplicates
  if (validated.code && validated.code.toUpperCase() !== existing.code) {
    const duplicateCode = await prisma.venue.findFirst({
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
            message: `Venue with code ${validated.code} already exists`,
          },
        },
        { status: 409 }
      );
    }
  }

  const { shopIds, ...updateData } = validated;

  const venue = await prisma.venue.update({
    where: { id },
    data: {
      ...updateData,
      code: updateData.code?.toUpperCase(),
      ...(shopIds !== undefined && { shopIds }),
    },
  });

  return successResponse(venue, { message: "Venue updated successfully" });
}

/**
 * DELETE /api/v1/mall/venues/[id]
 * Delete a venue
 */
async function deleteVenueHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  const venue = await prisma.venue.findUnique({
    where: { id },
  });

  if (!venue) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VENUE_NOT_FOUND",
          message: "Venue not found",
        },
      },
      { status: 404 }
    );
  }

  await prisma.venue.delete({
    where: { id },
  });

  return noContentResponse();
}

// ============================================================================
// EXPORTS
// ============================================================================

export const GET = withMiddleware(getVenueHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
});

export const PUT = withMiddleware(updateVenueHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
});

export const DELETE = withMiddleware(deleteVenueHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
});
