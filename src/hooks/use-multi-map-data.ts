"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiClient } from "@/lib/api-client";
import type { MapShop } from "./use-map-data";

// ============================================================================
// Types
// ============================================================================

export interface BuildingMapState {
  buildingCode: string;
  buildingName: string;
  currentFloor: string;
  floors: { floor: string; label?: string }[];
  svgMarkup: string | null;
  center: [number, number];
  rotation: number;
  scale: number;
  shops: MapShop[];
  loading: boolean;
}

interface AllMapsBuilding {
  buildingCode: string;
  buildingName: string;
  map: {
    id: string;
    building: string;
    floor: string;
    svgUrl: string;
    geo?: {
      latitude: number;
      longitude: number;
      rotation: number;
      scale: number;
    };
  } | null;
  shops: MapShop[];
  floors: Array<{ floor: number; label: string | null; hasMap: boolean }>;
  meta: { totalShops: number; vacantShops: number; occupiedShops: number };
}

interface AllMapsResponse {
  buildings: AllMapsBuilding[];
}

// For floor-switch, reuse the single-building response shape
interface SingleMapResponse {
  map: {
    id: string;
    building: string | null;
    floor: string;
    svgUrl: string;
    geo?: {
      latitude: number;
      longitude: number;
      rotation: number;
      scale: number;
    };
  } | null;
  shops: MapShop[];
}

export interface UseMultiMapDataOptions {
  includeVacant?: boolean;
}

export interface UseMultiMapDataReturn {
  buildings: BuildingMapState[];
  globalCenter: [number, number];
  globalLoading: boolean;
  globalError: string | null;
  setFloorForBuilding: (buildingCode: string, floor: string) => void;
  allShopsBySvgId: Map<string, MapShop>;
  allShopSvgIds: Set<string>;
}

// Default: Yerevan
const DEFAULT_CENTER: [number, number] = [40.1792, 44.4991];

function sanitizeSvg(svgText: string): string {
  return svgText
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "");
}

// ============================================================================
// Hook
// ============================================================================

export function useMultiMapData(
  options?: UseMultiMapDataOptions
): UseMultiMapDataReturn {
  const [buildings, setBuildings] = useState<BuildingMapState[]>([]);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const includeVacant = options?.includeVacant ?? false;

  // Load all buildings on mount
  useEffect(() => {
    let cancelled = false;

    async function loadAll(): Promise<void> {
      try {
        setGlobalLoading(true);
        setGlobalError(null);

        const res = await apiClient.get<AllMapsResponse>(
          "/mall/maps/all",
          {
            includeShops: "true",
            includeVacant: includeVacant ? "true" : "false",
          },
          { showErrorToast: false }
        );

        if (!res.success) throw new Error(res.error.message);
        if (cancelled) return;

        const allBuildings = res.data.buildings;

        // Fetch all SVGs in parallel
        const svgPromises = allBuildings.map(async (b) => {
          if (!b.map?.svgUrl) return null;
          try {
            const svgRes = await fetch(b.map.svgUrl);
            const svgText = await svgRes.text();
            return sanitizeSvg(svgText);
          } catch {
            return null;
          }
        });

        const svgs = await Promise.all(svgPromises);
        if (cancelled) return;

        const states: BuildingMapState[] = allBuildings.map((b, i) => ({
          buildingCode: b.buildingCode,
          buildingName: b.buildingName,
          currentFloor: b.map?.floor ?? "1",
          floors: b.floors
            .filter((f) => f.hasMap)
            .map((f) => ({
              floor: String(f.floor),
              label: f.label ?? undefined,
            })),
          svgMarkup: svgs[i],
          center: b.map?.geo
            ? [b.map.geo.latitude, b.map.geo.longitude]
            : DEFAULT_CENTER,
          rotation: b.map?.geo?.rotation ?? 0,
          scale: b.map?.geo?.scale ?? 1,
          shops: b.shops,
          loading: false,
        }));

        setBuildings(states);
      } catch (e) {
        if (!cancelled) {
          setGlobalError(
            e instanceof Error ? e.message : "Failed to load maps"
          );
        }
      } finally {
        if (!cancelled) setGlobalLoading(false);
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [includeVacant]);

  // Switch floor for a single building
  const setFloorForBuilding = useCallback(
    async (buildingCode: string, floor: string) => {
      // Mark that building as loading
      setBuildings((prev) =>
        prev.map((b) =>
          b.buildingCode === buildingCode
            ? { ...b, currentFloor: floor, loading: true }
            : b
        )
      );

      try {
        const res = await apiClient.get<SingleMapResponse>(
          "/mall/maps",
          {
            buildingCode,
            floor,
            includeShops: "true",
            includeVacant: includeVacant ? "true" : "false",
          },
          { showErrorToast: false }
        );

        if (!res.success) throw new Error(res.error.message);

        let svgMarkup: string | null = null;
        if (res.data.map?.svgUrl) {
          const svgRes = await fetch(res.data.map.svgUrl);
          const svgText = await svgRes.text();
          svgMarkup = sanitizeSvg(svgText);
        }

        const geo = res.data.map?.geo;

        setBuildings((prev) =>
          prev.map((b) => {
            if (b.buildingCode !== buildingCode) return b;
            return {
              ...b,
              currentFloor: floor,
              svgMarkup,
              center: geo ? [geo.latitude, geo.longitude] : b.center,
              rotation: geo?.rotation ?? b.rotation,
              scale: geo?.scale ?? b.scale,
              shops: res.data.shops,
              loading: false,
            };
          })
        );
      } catch {
        // Revert loading state
        setBuildings((prev) =>
          prev.map((b) =>
            b.buildingCode === buildingCode ? { ...b, loading: false } : b
          )
        );
      }
    },
    [includeVacant]
  );

  // Global center: centroid of all buildings
  const globalCenter = useMemo<[number, number]>(() => {
    if (buildings.length === 0) return DEFAULT_CENTER;
    const sumLat = buildings.reduce((s, b) => s + b.center[0], 0);
    const sumLng = buildings.reduce((s, b) => s + b.center[1], 0);
    return [sumLat / buildings.length, sumLng / buildings.length];
  }, [buildings]);

  // Merged shop lookups across all buildings
  const allShopsBySvgId = useMemo(() => {
    const m = new Map<string, MapShop>();
    for (const b of buildings) {
      for (const shop of b.shops) {
        if (shop.svgId) m.set(shop.svgId, shop);
      }
    }
    return m;
  }, [buildings]);

  const allShopSvgIds = useMemo(() => {
    const ids = new Set<string>();
    for (const b of buildings) {
      for (const shop of b.shops) {
        if (shop.svgId && (includeVacant || !shop.isVacant)) {
          ids.add(shop.svgId);
        }
      }
    }
    return ids;
  }, [buildings, includeVacant]);

  return {
    buildings,
    globalCenter,
    globalLoading,
    globalError,
    setFloorForBuilding,
    allShopsBySvgId,
    allShopSvgIds,
  };
}
