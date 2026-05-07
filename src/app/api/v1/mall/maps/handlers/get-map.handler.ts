import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { successResponse } from "@/lib/api/response";

import { mapQuerySchema } from "../schemas";
import type { MapResponse } from "../types";
import { buildShopWhereClause } from "../utils/build-shop-where-clause";
import { transformShopForMap } from "../utils/transform-shop-for-map";
import { MAP_SHOP_SELECT } from "../selects";

/**
 * GET /api/v1/mall/maps
 *
 * Returns map data for the public map page.
 * Supports both new schema (buildingCode + floor number) and legacy queries.
 *
 * Query params:
 * - buildingCode: B1, B2, etc. (new)
 * - venueCode: V1, V2, etc. (new, for outdoor venues)
 * - floor: floor number (1, 2, 3...)
 * - includeShops: true/false
 * - includeVacant: true/false
 */
export async function getMapHandler(
  request: NextRequest
): Promise<import("next/server").NextResponse> {
  const { searchParams } = new URL(request.url);

  const buildingCode =
    searchParams.get("buildingCode") || searchParams.get("building");
  const venueCode = searchParams.get("venueCode") || searchParams.get("venue");
  const floorParam = searchParams.get("floor");
  const includeShops = searchParams.get("includeShops") !== "false";
  const includeVacant = searchParams.get("includeVacant") !== "false";

  let svgUrl: string | null = null;
  let mapId: string | null = null;
  let mapType: "building" | "venue" | null = null;
  let resolvedBuildingId: string | null = null;
  let resolvedBuildingCode: string | null = null;
  let buildingGeo: {
    latitude: number;
    longitude: number;
    rotation: number;
    scale: number;
  } | null = null;

  // Try to find a floor map for a building
  if (buildingCode) {
    const building = await prisma.building.findFirst({
      where: { code: buildingCode.toUpperCase() },
      include: {
        floors: {
          where: floorParam ? { number: parseInt(floorParam, 10) } : undefined,
          orderBy: { number: "asc" },
          take: 1,
          include: {
            floorMap: true,
          },
        },
      },
    });

    if (building && building.floors.length > 0 && building.floors[0].floorMap) {
      const floor = building.floors[0];
      const floorMap = floor.floorMap!;
      svgUrl = floorMap.svgUrl;
      mapId = floorMap.id;
      mapType = "building";
      resolvedBuildingId = building.id;
      resolvedBuildingCode = building.code;
      // Use floor-level geo if available, fall back to building-level
      buildingGeo = {
        latitude: floor.latitude ?? building.latitude,
        longitude: floor.longitude ?? building.longitude,
        rotation: floor.rotation ?? building.rotation,
        scale: floor.scale ?? building.scale,
      };
    }
  }

  // Try to find a venue map if no building map found
  if (!svgUrl && venueCode) {
    const venue = await prisma.venue.findFirst({
      where: { code: venueCode.toUpperCase() },
    });
    if (venue && venue.svgUrl) {
      svgUrl = venue.svgUrl;
      mapId = venue.id;
      mapType = "venue";
      // Capture venue geo-positioning for map display
      buildingGeo = {
        latitude: venue.latitude,
        longitude: venue.longitude,
        rotation: venue.rotation,
        scale: venue.scale,
      };
    }
  }

  // If no specific building/venue requested, get the first available map
  if (!svgUrl && !buildingCode && !venueCode) {
    // Try first building
    const firstBuilding = await prisma.building.findFirst({
      include: {
        floors: {
          where: floorParam ? { number: parseInt(floorParam, 10) } : undefined,
          orderBy: { number: "asc" },
          take: 1,
          include: {
            floorMap: true,
          },
        },
      },
      orderBy: { code: "asc" },
    });

    if (
      firstBuilding &&
      firstBuilding.floors.length > 0 &&
      firstBuilding.floors[0].floorMap
    ) {
      const floor = firstBuilding.floors[0];
      const floorMap = floor.floorMap!;
      svgUrl = floorMap.svgUrl;
      mapId = floorMap.id;
      mapType = "building";
      resolvedBuildingId = firstBuilding.id;
      resolvedBuildingCode = firstBuilding.code;
      // Use floor-level geo if available, fall back to building-level
      buildingGeo = {
        latitude: floor.latitude ?? firstBuilding.latitude,
        longitude: floor.longitude ?? firstBuilding.longitude,
        rotation: floor.rotation ?? firstBuilding.rotation,
        scale: floor.scale ?? firstBuilding.scale,
      };
    } else {
      // Try first venue with a map
      const firstVenue = await prisma.venue.findFirst({
        where: { svgUrl: { not: null } },
        orderBy: { code: "asc" },
      });
      if (firstVenue && firstVenue.svgUrl) {
        svgUrl = firstVenue.svgUrl;
        mapId = firstVenue.id;
        mapType = "venue";
        buildingGeo = {
          latitude: firstVenue.latitude,
          longitude: firstVenue.longitude,
          rotation: firstVenue.rotation,
          scale: firstVenue.scale,
        };
      }
    }
  }

  const response: MapResponse = {
    map: svgUrl
      ? {
          id: mapId!,
          venue: venueCode || null,
          building: buildingCode || resolvedBuildingCode || null,
          floor: floorParam || "1",
          svgUrl,
          updatedAt: new Date(),
          // Include building geo-positioning for map display
          ...(buildingGeo && { geo: buildingGeo }),
        }
      : null,
    shops: [],
    meta: {
      totalShops: 0,
      vacantShops: 0,
      occupiedShops: 0,
    },
  };

  // Include available floors for the building
  if (resolvedBuildingId) {
    const floorsData = await prisma.floor.findMany({
      where: { buildingId: resolvedBuildingId },
      orderBy: { number: "asc" },
      select: {
        number: true,
        label: true,
        floorMap: { select: { id: true } },
      },
    });
    response.floors = floorsData.map((f) => ({
      floor: f.number,
      label: f.label,
      hasMap: !!f.floorMap,
    }));
  }

  if (includeShops && svgUrl) {
    // For default map (no venue/building specified), don't filter by location
    // since shops may use legacy fields or floorId relation
    // Only filter by venue/building if explicitly provided (not floor - floor format is ambiguous)
    const shouldFilterByLocation = venueCode || buildingCode;

    const shopWhere = shouldFilterByLocation
      ? buildShopWhereClause(
          venueCode || undefined,
          undefined, // Don't filter by floor - format is ambiguous (could be "1", "FF1", or null)
          buildingCode || undefined,
          includeVacant
        )
      : {
          isActive: true,
          ...(includeVacant ? {} : { sellerId: { not: null } }),
        };

    const shops = await prisma.shop.findMany({
      where: shopWhere,
      orderBy: { shopNumber: "asc" },
      select: MAP_SHOP_SELECT,
    });

    response.shops = shops.map(transformShopForMap);

    response.meta.totalShops = shops.length;
    response.meta.vacantShops = shops.filter((s) => !s.sellerId).length;
    response.meta.occupiedShops = shops.filter((s) => s.sellerId).length;
  }

  const headers = new Headers();
  headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=30");

  return successResponse(response, 200, Object.fromEntries(headers));
}
