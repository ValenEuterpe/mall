import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { successResponse, createdResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const createMallSchema = z.object({
  name: z.string().min(1).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().max(500).optional(),
});

const updateMallSchema = createMallSchema.partial();

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * GET /api/v1/mall/info
 * Get mall information (assumes single mall for now)
 */
async function getMallHandler(req: NextRequest): Promise<NextResponse> {
  const mall = await prisma.mall.findFirst({
    include: {
      buildings: {
        include: {
          floors: {
            orderBy: { number: "asc" },
            include: {
              floorMap: true,
              _count: { select: { shops: true } },
            },
          },
        },
        orderBy: { code: "asc" },
      },
      venues: {
        orderBy: { code: "asc" },
      },
    },
  });

  if (!mall) {
    return successResponse(null, { message: "No mall configured yet" });
  }

  return successResponse(mall);
}

/**
 * POST /api/v1/mall/info
 * Create mall (only if none exists)
 */
async function createMallHandler(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const validated = createMallSchema.parse(body);

  // Check if mall already exists
  const existing = await prisma.mall.findFirst();
  if (existing) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MALL_EXISTS",
          message: "Mall already exists. Use PUT to update.",
        },
      },
      { status: 409 }
    );
  }

  const mall = await prisma.mall.create({
    data: validated,
  });

  return createdResponse(mall, "Mall created successfully");
}

/**
 * PUT /api/v1/mall/info
 * Update mall information
 */
async function updateMallHandler(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const validated = updateMallSchema.parse(body);

  // Get existing mall
  const existing = await prisma.mall.findFirst();
  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MALL_NOT_FOUND",
          message: "No mall exists. Use POST to create.",
        },
      },
      { status: 404 }
    );
  }

  const mall = await prisma.mall.update({
    where: { id: existing.id },
    data: validated,
  });

  return successResponse(mall, { message: "Mall updated successfully" });
}

// ============================================================================
// EXPORTS
// ============================================================================

export const GET = withMiddleware(getMallHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
});

export const POST = withMiddleware(createMallHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
});

export const PUT = withMiddleware(updateMallHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
});
