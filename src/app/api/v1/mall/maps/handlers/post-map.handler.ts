import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-helper";
import prisma from "@/lib/db/prisma";
import { validateBody } from "@/lib/validation/request";
import { createdResponse } from "@/lib/api/response";
import { logger } from "@/lib/utils/logger";
import { ValidationError, NotFoundError } from "@/lib/errors/custom-errors";
import { z } from "zod";

/**
 * Schema for creating/updating a floor map via the legacy endpoint.
 * Supports both building floor maps and venue maps.
 */
const svgUrlSchema = z
  .string()
  .refine(
    (val) =>
      val.startsWith("/") ||
      val.startsWith("http://") ||
      val.startsWith("https://"),
    {
      message: "svgUrl must be a valid URL or relative path starting with /",
    }
  );

const mapCreateSchema = z
  .object({
    buildingCode: z.string().optional(),
    venueCode: z.string().optional(),
    floor: z.number().int().min(-10).max(100).optional(),
    svgUrl: svgUrlSchema.optional().nullable(),
  })
  .refine((data) => data.buildingCode || data.venueCode, {
    message: "Either buildingCode or venueCode is required",
  });

export async function postMapHandler(
  request: NextRequest
): Promise<NextResponse> {
  const user = requireAuth(request, ["MALL_OWNER"]);
  const data = await validateBody(request, mapCreateSchema);

  const { buildingCode, venueCode, floor, svgUrl } = data;

  // Handle building floor map
  if (buildingCode) {
    if (!svgUrl) {
      throw new ValidationError("svgUrl is required for building floor maps");
    }

    const building = await prisma.building.findFirst({
      where: { code: buildingCode.toUpperCase() },
    });

    if (!building) {
      throw new NotFoundError(`Building ${buildingCode} not found`);
    }

    const floorNum = floor ?? 1;
    const floorCode = `F${floorNum}`;

    // Find or create the Floor entity first
    let floorEntity = await prisma.floor.findFirst({
      where: {
        buildingId: building.id,
        number: floorNum,
      },
      include: { floorMap: true },
    });

    if (!floorEntity) {
      // Create the floor if it doesn't exist
      floorEntity = await prisma.floor.create({
        data: {
          buildingId: building.id,
          number: floorNum,
          code: floorCode,
        },
        include: { floorMap: true },
      });
    }

    const existingMap = floorEntity.floorMap;

    // Upsert the floor map
    const map = existingMap
      ? await prisma.floorMap.update({
          where: { id: existingMap.id },
          data: { svgUrl },
        })
      : await prisma.floorMap.create({
          data: {
            floorId: floorEntity.id,
            svgUrl,
          },
        });

    const action = existingMap ? "updated" : "created";

    logger.info(`Floor map ${action}`, {
      mapId: map.id,
      buildingCode,
      floor: floorNum,
      userId: user.userId,
    });

    return createdResponse({
      message: `Floor map ${action} successfully`,
      map: {
        id: map.id,
        building: buildingCode,
        floor: floorNum,
        svgUrl: map.svgUrl,
        updatedAt: map.updatedAt,
      },
    });
  }

  // Handle venue map - venues can have a single SVG for outdoor areas
  if (venueCode) {
    const venue = await prisma.venue.findFirst({
      where: { code: venueCode.toUpperCase() },
    });

    if (!venue) {
      throw new NotFoundError(`Venue ${venueCode} not found`);
    }

    // Parse SVG for shop IDs if provided in the request
    // For venue maps, we don't track individual shops - the SVG represents outdoor areas
    await prisma.venue.update({
      where: { id: venue.id },
      data: { svgUrl },
    });

    logger.info(`Venue map ${svgUrl ? "updated" : "cleared"}`, {
      venueCode,
      svgUrl,
      userId: user.userId,
    });

    return createdResponse({
      message: `Venue map ${svgUrl ? "updated" : "cleared"} successfully`,
      venue: venueCode,
      svgUrl,
    });
  }

  throw new ValidationError("Either buildingCode or venueCode is required");
}
