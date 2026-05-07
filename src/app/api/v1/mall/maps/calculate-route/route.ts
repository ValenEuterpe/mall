import { NextRequest } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { createSuccessResponse, createErrorResponse } from "@/app/response";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import {
  buildNavigationGraph,
  calculateShortestPath,
  findVertexByObjectId,
  buildCalculatedRoute,
  createCompositeId,
  type WayfindingData,
  type FloorWayfindingInput,
} from "@/lib/wayfinding";

const calculateRouteSchema = z.object({
  // Starting point: either an entrance ID or a composite vertex ID
  startEntranceId: z.string().optional(),
  startVertexId: z.string().optional(),
  startVenue: z.string().optional(),
  startBuilding: z.string().nullable().optional(),
  startFloor: z.string().optional(),

  // Destination: either a shop SVG ID (objectId) or a composite vertex ID
  destinationObjectId: z.string().optional(),
  destinationVertexId: z.string().optional(),
  destinationVenue: z.string().optional(),
  destinationBuilding: z.string().nullable().optional(),
  destinationFloor: z.string().optional(),
});

/**
 * POST /api/v1/mall/maps/calculate-route
 *
 * Calculate the shortest path between two points in the mall.
 * Supports multi-floor navigation.
 */
async function calculateRouteHandler(req: NextRequest) {
  const body = await req.json();
  const parsed = calculateRouteSchema.safeParse(body);

  if (!parsed.success) {
    return createErrorResponse(
      "VALIDATION_ERROR",
      "Invalid request body",
      400,
      { details: parsed.error.flatten().fieldErrors }
    );
  }

  const {
    startEntranceId,
    startVertexId,
    startVenue,
    startBuilding,
    startFloor,
    destinationObjectId,
    destinationVertexId,
    destinationVenue,
    destinationBuilding,
    destinationFloor,
  } = parsed.data;

  // Validate we have a starting point
  const hasStartEntrance = !!startEntranceId;
  const hasStartVertex = !!(startVertexId && startVenue && startFloor);

  if (!hasStartEntrance && !hasStartVertex) {
    return createErrorResponse(
      "VALIDATION_ERROR",
      "Must provide either startEntranceId or startVertexId with venue/floor",
      400
    );
  }

  // Validate we have a destination
  const hasDestinationObject = !!destinationObjectId;
  const hasDestinationVertex = !!(
    destinationVertexId &&
    destinationVenue &&
    destinationFloor
  );

  if (!hasDestinationObject && !hasDestinationVertex) {
    return createErrorResponse(
      "VALIDATION_ERROR",
      "Must provide either destinationObjectId or destinationVertexId with venue/floor",
      400
    );
  }

  // Load all wayfinding data
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

  // Build floor inputs for the navigation graph
  const floorInputs: FloorWayfindingInput[] = [];

  // Add building floors
  for (const building of mall.buildings) {
    for (const floor of building.floors) {
      if (floor.floorMap) {
        const wayfindingData = floor.floorMap
          .wayfindingData as WayfindingData | null;
        if (wayfindingData) {
          floorInputs.push({
            venue: "Main",
            building: building.code,
            floor: floor.number.toString(),
            data: wayfindingData,
          });
        }
      }
    }
  }

  // Add venues with wayfinding data
  for (const venue of mall.venues) {
    const wayfindingData = venue.wayfindingData as WayfindingData | null;
    if (wayfindingData) {
      floorInputs.push({
        venue: venue.code,
        building: null,
        floor: "1",
        data: wayfindingData,
      });
    }
  }

  if (floorInputs.length === 0) {
    return createErrorResponse(
      "VALIDATION_ERROR",
      "No wayfinding data available. Please upload wayfinding data first.",
      400
    );
  }

  // Build the navigation graph
  const graph = buildNavigationGraph(floorInputs);

  // Resolve start vertex
  let startCompositeId: string | null = null;

  if (hasStartEntrance) {
    // Find entrance by ID across all floors
    for (const input of floorInputs) {
      const entrance = input.data.entrances.find(
        (e) => e.id === startEntranceId
      );
      if (entrance) {
        startCompositeId = createCompositeId(
          input.venue,
          input.building,
          input.floor,
          entrance.vertexId
        );
        break;
      }
    }
    if (!startCompositeId) {
      return createErrorResponse(
        "NOT_FOUND",
        `Entrance not found: ${startEntranceId}`,
        404
      );
    }
  } else {
    if (!startVertexId || !startVenue || !startFloor) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Missing start vertex coordinates",
        400
      );
    }
    startCompositeId = createCompositeId(
      startVenue,
      startBuilding ?? null,
      startFloor,
      startVertexId
    );
    if (!graph.vertices.has(startCompositeId)) {
      return createErrorResponse(
        "NOT_FOUND",
        `Start vertex not found: ${startCompositeId}`,
        404
      );
    }
  }

  // Resolve destination vertex
  let destinationCompositeId: string | null = null;

  if (hasDestinationObject) {
    if (!destinationObjectId) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Missing destination object id",
        400
      );
    }
    // Find vertex by objectId (shop SVG ID)
    destinationCompositeId = findVertexByObjectId(graph, destinationObjectId);
    if (!destinationCompositeId) {
      return createErrorResponse(
        "NOT_FOUND",
        `Shop not found in wayfinding data: ${destinationObjectId}`,
        404
      );
    }
  } else {
    if (!destinationVertexId || !destinationVenue || !destinationFloor) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Missing destination vertex coordinates",
        400
      );
    }
    destinationCompositeId = createCompositeId(
      destinationVenue,
      destinationBuilding ?? null,
      destinationFloor,
      destinationVertexId
    );
    if (!graph.vertices.has(destinationCompositeId)) {
      return createErrorResponse(
        "NOT_FOUND",
        `Destination vertex not found: ${destinationCompositeId}`,
        404
      );
    }
  }

  // Calculate shortest path
  const result = calculateShortestPath(
    graph,
    startCompositeId,
    destinationCompositeId
  );

  if (!result.found) {
    return createSuccessResponse({
      found: false,
      message: "No path found between the specified locations",
      route: null,
    });
  }

  // Build the calculated route with segments
  const route = buildCalculatedRoute(graph, result.path, result.totalDistance);

  // Get start and destination details for response
  const startVertex = graph.vertices.get(startCompositeId);
  const destVertex = graph.vertices.get(destinationCompositeId);

  return createSuccessResponse({
    found: true,
    route,
    start: {
      compositeId: startCompositeId,
      venue: startVertex?.venue,
      building: startVertex?.building,
      floor: startVertex?.floor,
      position: startVertex ? { cx: startVertex.cx, cy: startVertex.cy } : null,
      entranceName: startVertex?.entranceName,
    },
    destination: {
      compositeId: destinationCompositeId,
      venue: destVertex?.venue,
      building: destVertex?.building,
      floor: destVertex?.floor,
      position: destVertex ? { cx: destVertex.cx, cy: destVertex.cy } : null,
      objectId: destVertex?.objectId,
    },
  });
}

export const POST = withMiddleware(calculateRouteHandler, {
  requireAuth: false,
  rateLimit: true,
});
