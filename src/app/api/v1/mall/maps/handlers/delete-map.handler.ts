import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-helper";
import prisma from "@/lib/db/prisma";
import { successResponse } from "@/lib/api/response";
import { ValidationError, NotFoundError } from "@/lib/errors/custom-errors";
import { logger } from "@/lib/utils/logger";

/**
 * DELETE /api/v1/mall/maps
 *
 * Delete a floor map or venue map.
 *
 * Query params:
 * - buildingCode: B1, B2, etc. (for building floor maps)
 * - venueCode: V1, V2, etc. (for venue maps)
 * - floor: floor number (required for building maps)
 */
export async function deleteMapHandler(
  request: NextRequest
): Promise<NextResponse> {
  const user = requireAuth(request, ["MALL_OWNER"]);
  const { searchParams } = new URL(request.url);

  const buildingCode =
    searchParams.get("buildingCode") || searchParams.get("building");
  const venueCode = searchParams.get("venueCode") || searchParams.get("venue");
  const floorParam = searchParams.get("floor");

  // Delete building floor map
  if (buildingCode) {
    if (!floorParam) {
      throw new ValidationError("Floor is required for building maps");
    }

    const building = await prisma.building.findFirst({
      where: { code: buildingCode.toUpperCase() },
    });

    if (!building) {
      throw new NotFoundError(`Building ${buildingCode} not found`);
    }

    const floorNum = parseInt(floorParam, 10);

    // Find floor with its map
    const floorEntity = await prisma.floor.findFirst({
      where: {
        buildingId: building.id,
        number: floorNum,
      },
      include: { floorMap: true },
    });

    if (!floorEntity || !floorEntity.floorMap) {
      throw new NotFoundError("Floor map not found");
    }

    await prisma.floorMap.delete({
      where: { id: floorEntity.floorMap.id },
    });

    logger.info("Floor map deleted", {
      mapId: floorEntity.floorMap.id,
      buildingCode,
      floor: floorNum,
      userId: user.userId,
    });

    return successResponse({ message: "Floor map deleted successfully" });
  }

  // Delete venue map - clear the svgUrl field
  if (venueCode) {
    const venue = await prisma.venue.findFirst({
      where: { code: venueCode.toUpperCase() },
    });

    if (!venue) {
      throw new NotFoundError(`Venue ${venueCode} not found`);
    }

    if (!venue.svgUrl) {
      throw new NotFoundError("Venue has no map to delete");
    }

    await prisma.venue.update({
      where: { id: venue.id },
      data: { svgUrl: null },
    });

    logger.info("Venue map deleted", {
      venueCode,
      userId: user.userId,
    });

    return successResponse({ message: "Venue map deleted successfully" });
  }

  throw new ValidationError("Either buildingCode or venueCode is required");
}
