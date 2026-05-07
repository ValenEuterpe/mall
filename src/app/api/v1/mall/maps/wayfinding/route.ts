import { NextRequest } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { createSuccessResponse, createErrorResponse } from "@/app/response";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import type { Venue } from "@/prisma/generated/client";
import type { WayfindingData } from "@/lib/wayfinding";

// Schema for wayfinding data validation
const wayfindingVertexSchema = z.object({
  id: z.string().min(1),
  cx: z.number(),
  cy: z.number(),
  objectId: z.string().nullable().optional(),
  isEntrance: z.boolean().optional(),
  entranceName: z.string().optional(),
  floorConnector: z
    .object({
      type: z.enum(["elevator", "stairs", "escalator"]),
      name: z.string(),
      connectorGroupId: z.string(),
    })
    .optional(),
});

const wayfindingEdgeSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  weight: z.number().positive().optional(),
  oneWay: z.boolean().optional(),
});

const wayfindingEntranceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  vertexId: z.string().min(1),
  description: z.string().optional(),
});

const wayfindingDataSchema = z.object({
  vertices: z.array(wayfindingVertexSchema),
  edges: z.array(wayfindingEdgeSchema),
  entrances: z.array(wayfindingEntranceSchema),
});

const getQuerySchema = z.object({
  venue: z.string().optional(),
  building: z.string().optional(),
  floor: z.string().optional(),
});

const putBodySchema = z.object({
  venue: z.string().optional(),
  building: z.string().optional(),
  floor: z.string(),
  wayfindingData: wayfindingDataSchema,
});

/**
 * GET /api/v1/mall/maps/wayfinding
 *
 * Get wayfinding data for a specific floor/venue or all floors.
 */
async function getWayfindingHandler(req: NextRequest) {
  const url = new URL(req.url);
  const query = getQuerySchema.safeParse({
    venue: url.searchParams.get("venue") || undefined,
    building: url.searchParams.get("building") || undefined,
    floor: url.searchParams.get("floor") || undefined,
  });

  if (!query.success) {
    return createErrorResponse(
      "VALIDATION_ERROR",
      "Invalid query parameters",
      400,
      { details: query.error.flatten().fieldErrors }
    );
  }

  const { venue, building, floor } = query.data;

  // Get mall (assuming single mall for now)
  const mall = await prisma.mall.findFirst({
    include: {
      buildings: {
        include: {
          floors: {
            include: {
              floorMap: true,
            },
          },
        },
      },
      venues: true,
    },
  });

  if (!mall) {
    return createErrorResponse("NOT_FOUND", "Mall not found", 404);
  }

  const wayfindingFloors: Array<{
    venue: string;
    building: string | null;
    floor: string;
    wayfindingData: WayfindingData | null;
  }> = [];

  // If specific venue is requested (outdoor area)
  if (venue && !building) {
    const venueRecord = mall.venues.find(
      (v: Venue) => v.code === venue || v.name === venue
    );
    if (venueRecord) {
      wayfindingFloors.push({
        venue: venueRecord.code,
        building: null,
        floor: "1",
        wayfindingData: venueRecord.wayfindingData as WayfindingData | null,
      });
    }
  }
  // If specific building/floor is requested
  else if (building && floor) {
    const buildingRecord = mall.buildings.find(
      (b: { code: string; name: string }) =>
        b.code === building || b.name === building
    );
    if (buildingRecord) {
      const floorRecord = buildingRecord.floors.find(
        (f: { number: number }) => f.number.toString() === floor
      );
      if (floorRecord && floorRecord.floorMap) {
        wayfindingFloors.push({
          venue: venue || "Main",
          building: buildingRecord.code,
          floor: floorRecord.number.toString(),
          wayfindingData: floorRecord.floorMap
            .wayfindingData as WayfindingData | null,
        });
      }
    }
  }
  // Return all floors
  else {
    // Add all building floors
    for (const buildingRecord of mall.buildings) {
      for (const floorRecord of buildingRecord.floors) {
        if (floorRecord.floorMap) {
          wayfindingFloors.push({
            venue: "Main",
            building: buildingRecord.code,
            floor: floorRecord.number.toString(),
            wayfindingData: floorRecord.floorMap
              .wayfindingData as WayfindingData | null,
          });
        }
      }
    }
    // Add all venues with wayfinding data
    for (const venueRecord of mall.venues) {
      wayfindingFloors.push({
        venue: venueRecord.code,
        building: null,
        floor: "1",
        wayfindingData: venueRecord.wayfindingData as WayfindingData | null,
      });
    }
  }

  return createSuccessResponse({
    floors: wayfindingFloors,
    entrances: wayfindingFloors
      .filter((f) => f.wayfindingData?.entrances?.length)
      .flatMap((f) =>
        f.wayfindingData!.entrances.map((e) => ({
          ...e,
          venue: f.venue,
          building: f.building,
          floor: f.floor,
        }))
      ),
  });
}

/**
 * PUT /api/v1/mall/maps/wayfinding
 *
 * Update wayfinding data for a specific floor/venue.
 * Mall owner only.
 */
async function putWayfindingHandler(req: NextRequest) {
  const body = await req.json();
  const parsed = putBodySchema.safeParse(body);

  if (!parsed.success) {
    return createErrorResponse(
      "VALIDATION_ERROR",
      "Invalid request body",
      400,
      { details: parsed.error.flatten().fieldErrors }
    );
  }

  const { venue, building, floor, wayfindingData } = parsed.data;

  // Validate wayfinding data integrity
  const vertexIds = new Set(wayfindingData.vertices.map((v) => v.id));

  // Check that all edges reference valid vertices
  for (const edge of wayfindingData.edges) {
    if (!vertexIds.has(edge.from)) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        `Edge ${edge.id} references non-existent vertex: ${edge.from}`,
        400
      );
    }
    if (!vertexIds.has(edge.to)) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        `Edge ${edge.id} references non-existent vertex: ${edge.to}`,
        400
      );
    }
  }

  // Check that all entrances reference valid vertices
  for (const entrance of wayfindingData.entrances) {
    if (!vertexIds.has(entrance.vertexId)) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        `Entrance ${entrance.id} references non-existent vertex: ${entrance.vertexId}`,
        400
      );
    }
    // Ensure the referenced vertex has isEntrance=true
    const vertex = wayfindingData.vertices.find(
      (v) => v.id === entrance.vertexId
    );
    if (vertex && !vertex.isEntrance) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        `Entrance ${entrance.id} references vertex ${entrance.vertexId} which is not marked as entrance`,
        400
      );
    }
  }

  // Get mall
  const mall = await prisma.mall.findFirst({
    include: {
      buildings: true,
      venues: true,
    },
  });

  if (!mall) {
    return createErrorResponse("NOT_FOUND", "Mall not found", 404);
  }

  // Update venue wayfinding data
  if (!building) {
    if (!venue) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Venue is required when building is not specified",
        400
      );
    }

    const venueRecord = mall.venues.find(
      (v: Venue) => v.code === venue || v.name === venue
    );
    if (!venueRecord) {
      return createErrorResponse("NOT_FOUND", `Venue not found: ${venue}`, 404);
    }

    await prisma.venue.update({
      where: { id: venueRecord.id },
      data: { wayfindingData: JSON.parse(JSON.stringify(wayfindingData)) },
    });

    return createSuccessResponse({
      message: "Venue wayfinding data updated",
      venue: venueRecord.code,
    });
  }

  // Update building floor wayfinding data
  const buildingRecord = mall.buildings.find(
    (b: { code: string; name: string }) =>
      b.code === building || b.name === building
  );
  if (!buildingRecord) {
    return createErrorResponse(
      "NOT_FOUND",
      `Building not found: ${building}`,
      404
    );
  }

  // Find floor with its map
  const floorRecord = await prisma.floor.findFirst({
    where: {
      buildingId: buildingRecord.id,
      number: parseInt(floor, 10),
    },
    include: { floorMap: true },
  });

  if (!floorRecord || !floorRecord.floorMap) {
    return createErrorResponse(
      "NOT_FOUND",
      `Floor map not found: Building ${building}, Floor ${floor}`,
      404
    );
  }

  await prisma.floorMap.update({
    where: { id: floorRecord.floorMap.id },
    data: { wayfindingData: JSON.parse(JSON.stringify(wayfindingData)) },
  });

  return createSuccessResponse({
    message: "Wayfinding data updated",
    building: buildingRecord.code,
    floor,
  });
}

export const GET = withMiddleware(getWayfindingHandler, {
  requireAuth: false,
  rateLimit: true,
});

export const PUT = withMiddleware(putWayfindingHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
});
