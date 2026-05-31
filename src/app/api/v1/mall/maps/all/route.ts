import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { successResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";
import { MAP_SHOP_SELECT } from "../selects";
import { transformShopForMap } from "../utils/transform-shop-for-map";

/**
 * GET /api/v1/mall/maps/all
 *
 * Returns map data for ALL buildings that have at least one floor with a floor map.
 * Used by the public map page to render multiple building overlays simultaneously.
 *
 * Query params:
 * - includeShops: true/false (default true)
 * - includeVacant: true/false (default true)
 */
async function getAllMapsHandler(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const includeShops = searchParams.get("includeShops") !== "false";
  const includeVacant = searchParams.get("includeVacant") !== "false";

  // Fetch all buildings that have at least one floor with a floorMap
  const buildings = await prisma.building.findMany({
    where: {
      floors: {
        some: {
          floorMap: { isNot: null },
        },
      },
    },
    orderBy: { code: "asc" },
    include: {
      floors: {
        orderBy: { number: "asc" },
        include: {
          floorMap: {
            select: { id: true, svgUrl: true },
          },
        },
      },
    },
  });

  const result = await Promise.all(
    buildings.map(async (building) => {
      // Use first floor that has a map
      const firstFloorWithMap = building.floors.find((f) => f.floorMap);

      const floorMap = firstFloorWithMap?.floorMap;

      // Build geo from floor-level (with building fallback)
      const geo = firstFloorWithMap
        ? {
            latitude: firstFloorWithMap.latitude ?? building.latitude,
            longitude: firstFloorWithMap.longitude ?? building.longitude,
            rotation: firstFloorWithMap.rotation ?? building.rotation,
            scale: firstFloorWithMap.scale ?? building.scale,
          }
        : {
            latitude: building.latitude,
            longitude: building.longitude,
            rotation: building.rotation,
            scale: building.scale,
          };

      // Floors list
      const floors = building.floors.map((f) => ({
        floor: f.number,
        label: f.label,
        hasMap: !!f.floorMap,
      }));

      // Fetch shops for this building
      let shops: any[] = [];
      let meta = { totalShops: 0, vacantShops: 0, occupiedShops: 0 };

      if (includeShops && floorMap) {
        const shopWhere: any = {
          isActive: true,
          building: building.code,
        };
        if (!includeVacant) {
          shopWhere.sellerId = { not: null };
        }

        const rawShops = await prisma.shop.findMany({
          where: shopWhere,
          orderBy: { shopNumber: "asc" },
          select: MAP_SHOP_SELECT,
        });

        shops = rawShops.map(transformShopForMap);
        meta = {
          totalShops: rawShops.length,
          vacantShops: rawShops.filter((s) => !s.sellerId).length,
          occupiedShops: rawShops.filter((s) => s.sellerId).length,
        };
      }

      return {
        buildingCode: building.code,
        buildingName: building.name,
        map: floorMap
          ? {
              id: floorMap.id,
              building: building.code,
              floor: String(firstFloorWithMap!.number),
              svgUrl: floorMap.svgUrl,
              geo,
            }
          : null,
        shops,
        floors,
        meta,
      };
    })
  );

  const headers = new Headers();
  headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=30");

  return successResponse(
    { buildings: result },
    200,
    Object.fromEntries(headers)
  );
}

export const GET = withMiddleware(getAllMapsHandler, {
  requireAuth: false,
  rateLimit: true,
});
