"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { apiClient } from "@/lib/api-client";

// ============================================================================
// Types
// ============================================================================

export interface MapData {
  map: {
    id: string;
    venue: string;
    building: string | null;
    floor: string;
    svgUrl: string;
  } | null;
  shops: MapShop[];
}

export interface MapShop {
  id: string;
  fullCode: string;
  svgId: string | null;
  shopName: string | null;
  description: string | null;
  imageUrl: string | null;
  isVacant: boolean;
  openingHours?: Record<string, string> | null;
  contacts?: Array<{ type: string; value: string; label: string | null }>;
  shopType?: {
    id: string;
    key: string;
    name_en: string;
    name_ru: string;
    name_am: string | null;
    icon: string | null;
    color: string | null;
  } | null;
  seller?: {
    businessName: string | null;
    logoUrl: string | null;
    phone: string | null;
    socialLinks: Record<string, string> | null;
  } | null;
}

interface MapGeoResponse {
  map:
    | (MapData["map"] & {
        geo?: {
          latitude: number;
          longitude: number;
          rotation: number;
          scale: number;
        };
      })
    | null;
  shops: MapShop[];
  floors?: Array<{ floor: number; label: string | null; hasMap: boolean }>;
}

export interface UseMapDataOptions {
  initialFloor?: string;
  includeVacant?: boolean;
  /** Seed the building code so the correct building loads on first fetch */
  buildingCode?: string;
}

export interface UseMapDataReturn {
  currentFloor: string;
  setCurrentFloor: (floor: string) => void;
  floors: { floor: string; label?: string }[];
  svgMarkup: string | null;
  mapCenter: [number, number];
  mapRotation: number;
  mapScale: number;
  mapLoading: boolean;
  mapError: string | null;
  mapData: MapData | null;
  shopsBySvgId: Map<string, MapShop>;
  shopSvgIds: Set<string>;
}

// Default: Yerevan
const DEFAULT_CENTER: [number, number] = [40.1792, 44.4991];

export function useMapData(options?: UseMapDataOptions): UseMapDataReturn {
  const [currentFloor, setCurrentFloor] = useState(
    options?.initialFloor ?? "1"
  );
  const [floors, setFloors] = useState<{ floor: string; label?: string }[]>([]);
  const buildingCodeRef = useRef<string | null>(options?.buildingCode ?? null);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapRotation, setMapRotation] = useState(0);
  const [mapScale, setMapScale] = useState(1);

  // Load map data when floor changes
  useEffect(() => {
    let cancelled = false;

    async function loadMap(): Promise<void> {
      try {
        setMapLoading(true);
        setMapError(null);

        const params: Record<string, string> = {
          floor: currentFloor,
          includeShops: "true",
          includeVacant: options?.includeVacant ? "true" : "false",
        };
        if (buildingCodeRef.current)
          params.buildingCode = buildingCodeRef.current;

        const res = await apiClient.get<MapGeoResponse>("/mall/maps", params, {
          showErrorToast: false,
        });

        if (!res.success) throw new Error(res.error.message);

        if (!cancelled) {
          setMapData({ map: res.data.map, shops: res.data.shops });

          // Track building code for subsequent floor-switch requests
          if (res.data.map?.building) {
            buildingCodeRef.current = res.data.map.building;
          }

          // Populate floors from API response
          if (res.data.floors && res.data.floors.length > 0) {
            setFloors(
              res.data.floors
                .filter((f) => f.hasMap)
                .map((f) => ({
                  floor: String(f.floor),
                  label: f.label ?? undefined,
                }))
            );
          }

          if (res.data.map?.geo) {
            const { latitude, longitude, rotation, scale } = res.data.map.geo;
            if (latitude && longitude) {
              setMapCenter([latitude, longitude]);
            }
            if (rotation !== undefined) setMapRotation(rotation);
            if (scale !== undefined && scale > 0) setMapScale(scale);
          }
        }

        const svgUrl = res.data.map?.svgUrl;
        if (svgUrl) {
          const svgRes = await fetch(svgUrl);
          const svgText = await svgRes.text();
          if (!cancelled) {
            const sanitized = svgText
              .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
              .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
              .replace(/\son\w+\s*=\s*'[^']*'/gi, "");
            setSvgMarkup(sanitized);
          }
        } else {
          if (!cancelled) setSvgMarkup(null);
        }
      } catch (e) {
        if (!cancelled) {
          setMapError(e instanceof Error ? e.message : "Failed to load map");
        }
      } finally {
        if (!cancelled) setMapLoading(false);
      }
    }

    loadMap();

    return () => {
      cancelled = true;
    };
  }, [currentFloor, options?.includeVacant]);

  const shopsBySvgId = useMemo(() => {
    const m = new Map<string, MapShop>();
    for (const shop of mapData?.shops ?? []) {
      if (shop.svgId) m.set(shop.svgId, shop);
    }
    return m;
  }, [mapData?.shops]);

  const shopSvgIds = useMemo(() => {
    const ids = new Set<string>();
    for (const shop of mapData?.shops ?? []) {
      if (shop.svgId && (options?.includeVacant || !shop.isVacant)) {
        ids.add(shop.svgId);
      }
    }
    return ids;
  }, [mapData?.shops, options?.includeVacant]);

  return {
    currentFloor,
    setCurrentFloor,
    floors,
    svgMarkup,
    mapCenter,
    mapRotation,
    mapScale,
    mapLoading,
    mapError,
    mapData,
    shopsBySvgId,
    shopSvgIds,
  };
}
