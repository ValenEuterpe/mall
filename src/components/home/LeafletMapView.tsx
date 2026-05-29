"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, MapPin, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MapFloorSelector } from "./MapFloorSelector";

// Fix for default marker icons in Leaflet with webpack/Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// ============================================================================
// Types
// ============================================================================

export interface BuildingOverlay {
  buildingCode: string;
  svgContent: string | null;
  center: [number, number];
  rotation: number;
  scale: number;
  floors?: { floor: string; label?: string }[];
  currentFloor?: string;
  onFloorChange?: (floor: string) => void;
}

export interface LeafletMapViewProps {
  /** Single building SVG (backward compat) */
  svgContent?: string | null;
  /** Map center */
  center: [number, number];
  /** Single building rotation (backward compat) */
  rotation?: number;
  /** Single building scale (backward compat) */
  scale?: number;
  loading: boolean;
  error: string | null;
  selectedCount: number;
  shopSvgIds?: Set<string>;
  activeShopSvgId?: string | null;
  onShopClick?: (svgId: string) => void;
  vacantSvgIds?: Set<string>;
  /** Single building floors (backward compat) */
  floors?: { floor: string; label?: string }[];
  currentFloor?: string;
  onFloorChange?: (floor: string) => void;
  /** Multi-building mode: when provided, overrides single-building props */
  buildings?: BuildingOverlay[];
}

// ============================================================================
// Helpers
// ============================================================================

interface FloorSelectorState {
  pos: { x: number; y: number } | null;
  visible: boolean;
}

function processSvgContent(
  content: string
): { content: string; aspectRatio: number } {
  const measureLayer = document.createElement("div");
  measureLayer.style.cssText =
    "position: absolute; visibility: hidden; pointer-events: none;";
  document.body.appendChild(measureLayer);
  measureLayer.innerHTML = content;

  const svgEl = measureLayer.querySelector("svg");

  if (svgEl) {
    try {
      const bbox = svgEl.getBBox();
      svgEl.setAttribute(
        "viewBox",
        `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`
      );
      svgEl.setAttribute("width", "100%");
      svgEl.setAttribute("height", "100%");
      svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");

      const processedContent = new XMLSerializer().serializeToString(svgEl);
      const aspectRatio = bbox.width / bbox.height;
      document.body.removeChild(measureLayer);
      return { content: processedContent, aspectRatio };
    } catch {
      document.body.removeChild(measureLayer);
      svgEl.setAttribute("width", "100%");
      svgEl.setAttribute("height", "100%");
      return { content, aspectRatio: 1 };
    }
  }

  document.body.removeChild(measureLayer);
  return { content, aspectRatio: 1 };
}

// ============================================================================
// Component
// ============================================================================

export const LeafletMapView = memo(function LeafletMapView({
  svgContent,
  center,
  rotation = 0,
  scale = 1,
  loading,
  error,
  selectedCount,
  shopSvgIds,
  activeShopSvgId,
  onShopClick,
  vacantSvgIds,
  floors,
  currentFloor,
  onFloorChange,
  buildings,
}: LeafletMapViewProps) {
  const t = useTranslations("home.map");
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [markerVersion, setMarkerVersion] = useState(0);

  // --- Multi-building state ---
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const baseZoomsRef = useRef<Map<string, number>>(new Map());
  const processedSvgsRef = useRef<
    Map<string, { content: string; aspectRatio: number }>
  >(new Map());
  const [floorSelectors, setFloorSelectors] = useState<
    Map<string, FloorSelectorState>
  >(new Map());
  const floorHideTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const fitBoundsDoneRef = useRef(false);

  // --- Single-building backward compat state ---
  const svgMarkerRef = useRef<L.Marker | null>(null);
  const processedSvgRef = useRef<{
    content: string;
    aspectRatio: number;
  } | null>(null);
  const baseZoomRef = useRef<number>(18);
  const baseZoomInitializedRef = useRef<boolean>(false);
  const floorHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [floorSelectorPos, setFloorSelectorPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [floorSelectorVisible, setFloorSelectorVisible] = useState(false);

  const stateRef = useRef({ scale, rotation, aspectRatio: 1 });
  useEffect(() => {
    stateRef.current = {
      scale,
      rotation,
      aspectRatio: stateRef.current.aspectRatio,
    };
  }, [scale, rotation]);

  // Refs for floor selector callbacks
  const floorChangeRef = useRef(onFloorChange);
  const floorsRef = useRef(floors);
  const currentFloorRef = useRef(currentFloor);
  useEffect(() => {
    floorChangeRef.current = onFloorChange;
    floorsRef.current = floors;
    currentFloorRef.current = currentFloor;
  }, [onFloorChange, floors, currentFloor]);

  const isMultiBuilding = buildings && buildings.length > 0;

  // Determine what content is actually being shown (for overlay states)
  const hasAnySvg = isMultiBuilding
    ? buildings.some((b) => b.svgContent)
    : !!svgContent;

  // =========================================================================
  // Initialize Leaflet map
  // =========================================================================
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapRef.current) return;

    let cleanupFn: (() => void) | undefined;

    try {
      const map = L.map(container, {
        center,
        zoom: 18,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
        maxZoom: 22,
        attribution: "",
      }).addTo(map);

      mapRef.current = map;

      const safeInvalidate = () => {
        if (mapRef.current && container.isConnected) {
          try {
            mapRef.current.invalidateSize();
          } catch {
            // Ignore errors during cleanup
          }
        }
      };

      setMapReady(true);
      safeInvalidate();
      setTimeout(safeInvalidate, 100);
      setTimeout(safeInvalidate, 500);

      const resizeObserver = new ResizeObserver(() => {
        safeInvalidate();
      });
      resizeObserver.observe(container);

      cleanupFn = () => {
        resizeObserver.disconnect();
        setMapReady(false);
        mapRef.current = null;
        map.remove();
      };
    } catch (err) {
      console.error("[LeafletMapView] Failed to initialize map:", err);
    }

    return cleanupFn;
  }, []);

  // Center map when center changes (single-building mode only)
  useEffect(() => {
    if (mapRef.current && center && !isMultiBuilding) {
      mapRef.current.setView(center, mapRef.current.getZoom());
    }
  }, [center, isMultiBuilding]);

  // =========================================================================
  // MULTI-BUILDING: Create/update markers
  // =========================================================================
  useEffect(() => {
    if (!isMultiBuilding || !mapRef.current || !mapReady) return;

    const map = mapRef.current;
    const currentMarkers = markersRef.current;
    const currentCodes = new Set(buildings.map((b) => b.buildingCode));

    // Remove markers for buildings no longer in the list
    for (const [code, marker] of currentMarkers) {
      if (!currentCodes.has(code)) {
        marker.remove();
        currentMarkers.delete(code);
        baseZoomsRef.current.delete(code);
        processedSvgsRef.current.delete(code);
      }
    }

    // Create/update markers for each building
    for (const b of buildings) {
      if (!b.svgContent) {
        // Remove marker if SVG was removed
        const existing = currentMarkers.get(b.buildingCode);
        if (existing) {
          existing.remove();
          currentMarkers.delete(b.buildingCode);
        }
        continue;
      }

      // Process SVG
      const processed = processSvgContent(b.svgContent);
      processedSvgsRef.current.set(b.buildingCode, processed);

      // Set base zoom if not set
      if (!baseZoomsRef.current.has(b.buildingCode)) {
        baseZoomsRef.current.set(b.buildingCode, map.getZoom());
      }

      const baseWidth = 200 * b.scale;
      const baseHeight = baseWidth / processed.aspectRatio;
      // Apply the current zoom-derived scale in the initial marker HTML so the
      // wrapper renders at the right size immediately on re-creation (e.g.,
      // floor swap while the user is zoomed in). Without this, the inline
      // transform is scale(1) until the next zoom event writes the true value.
      const initialBaseZoom =
        baseZoomsRef.current.get(b.buildingCode) ?? map.getZoom();
      const initialScale = Math.pow(2, map.getZoom() - initialBaseZoom);

      const icon = L.divIcon({
        className: "svg-marker-wrapper",
        html: `
          <div id="svgwrapper-${b.buildingCode}" class="svgwrapper" style="
            width: ${baseWidth}px;
            height: ${baseHeight}px;
            position: relative;
            transform: rotate(${b.rotation}deg) scale(${initialScale});
            transform-origin: center center;
          ">
            ${processed.content}
          </div>
        `,
        iconSize: [baseWidth, baseHeight],
        iconAnchor: [baseWidth / 2, baseHeight / 2],
      });

      // Remove old marker if exists
      const existing = currentMarkers.get(b.buildingCode);
      if (existing) existing.remove();

      const marker = L.marker(b.center, {
        icon,
        zIndexOffset: 500,
      });
      marker.addTo(map);
      currentMarkers.set(b.buildingCode, marker);
    }

    setMarkerVersion((v) => v + 1);

    // Zoom handling for all markers
    const onZoomAnim = (e: L.ZoomAnimEvent) => {
      for (const [code, marker] of currentMarkers) {
        const el = marker.getElement();
        if (!el) continue;
        const inner = el.querySelector(`.svgwrapper`) as HTMLElement;
        if (!inner) continue;

        const baseZoom = baseZoomsRef.current.get(code) ?? 18;
        const scaleFactor = Math.pow(2, e.zoom - baseZoom);
        const bld = buildings.find((b) => b.buildingCode === code);
        inner.style.transform = `rotate(${bld?.rotation ?? 0}deg) scale(${scaleFactor})`;
      }
    };

    const onZoomEnd = () => {
      for (const [code, marker] of currentMarkers) {
        const el = marker.getElement();
        if (!el) continue;
        const inner = el.querySelector(`.svgwrapper`) as HTMLElement;
        if (!inner) continue;

        const baseZoom = baseZoomsRef.current.get(code) ?? 18;
        const scaleFactor = Math.pow(2, map.getZoom() - baseZoom);
        const bld = buildings.find((b) => b.buildingCode === code);
        inner.style.transform = `rotate(${bld?.rotation ?? 0}deg) scale(${scaleFactor})`;
      }
    };

    map.on("zoomanim", onZoomAnim);
    map.on("zoomend", onZoomEnd);

    return () => {
      map.off("zoomanim", onZoomAnim);
      map.off("zoomend", onZoomEnd);
    };
  }, [isMultiBuilding, buildings, mapReady]);

  // MULTI-BUILDING: fitBounds to show all buildings on first load
  useEffect(() => {
    if (
      !isMultiBuilding ||
      !mapRef.current ||
      !mapReady ||
      fitBoundsDoneRef.current
    )
      return;

    const validBuildings = buildings.filter((b) => b.svgContent);
    if (validBuildings.length === 0) return;

    fitBoundsDoneRef.current = true;

    if (validBuildings.length === 1) {
      mapRef.current.setView(validBuildings[0].center, 18);
    } else {
      const bounds = L.latLngBounds(validBuildings.map((b) => b.center));
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 19 });
    }
  }, [isMultiBuilding, buildings, mapReady]);

  // Reset fitBounds flag when buildings change substantially
  useEffect(() => {
    fitBoundsDoneRef.current = false;
  }, [buildings?.length]);

  // MULTI-BUILDING: Floor selector position tracking for each building
  useEffect(() => {
    if (!isMultiBuilding || !mapReady) {
      setFloorSelectors(new Map());
      return;
    }

    const buildingsWithFloors = buildings.filter(
      (b) => b.floors && b.floors.length > 1 && b.svgContent
    );
    if (buildingsWithFloors.length === 0) {
      setFloorSelectors(new Map());
      return;
    }

    const updateAllPositions = (): void => {
      const container = mapContainerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();

      setFloorSelectors((prev) => {
        const next = new Map(prev);
        for (const b of buildingsWithFloors) {
          const wrapper = document.getElementById(
            `svgwrapper-${b.buildingCode}`
          );
          if (!wrapper) {
            next.set(b.buildingCode, {
              pos: null,
              visible: prev.get(b.buildingCode)?.visible ?? false,
            });
            continue;
          }
          const wrapperRect = wrapper.getBoundingClientRect();
          next.set(b.buildingCode, {
            pos: {
              x: wrapperRect.left - containerRect.left,
              y:
                wrapperRect.top +
                wrapperRect.height / 2 -
                containerRect.top,
            },
            visible: prev.get(b.buildingCode)?.visible ?? false,
          });
        }
        return next;
      });
    };

    updateAllPositions();

    // Observers for all wrappers
    const observers: Array<ResizeObserver | MutationObserver> = [];
    let mapContainer: Element | null = null;

    for (const b of buildingsWithFloors) {
      const wrapper = document.getElementById(
        `svgwrapper-${b.buildingCode}`
      );
      if (wrapper) {
        const resizeObs = new ResizeObserver(updateAllPositions);
        resizeObs.observe(wrapper);
        observers.push(resizeObs);

        if (!mapContainer) {
          mapContainer = wrapper.closest(".leaflet-container");
        }

        const leafletPane = wrapper.closest(".leaflet-map-pane");
        if (leafletPane) {
          const paneObs = new MutationObserver(updateAllPositions);
          paneObs.observe(leafletPane, {
            attributes: true,
            attributeFilter: ["style"],
            subtree: true,
          });
          observers.push(paneObs);
        }
      }
    }

    if (mapContainer) {
      mapContainer.addEventListener("mousemove", updateAllPositions, {
        passive: true,
      });
      mapContainer.addEventListener("touchmove", updateAllPositions, {
        passive: true,
      });
    }

    const bodyObs = new MutationObserver(updateAllPositions);
    bodyObs.observe(document.body, { childList: true, subtree: true });
    observers.push(bodyObs);

    return () => {
      for (const obs of observers) obs.disconnect();
      if (mapContainer) {
        mapContainer.removeEventListener("mousemove", updateAllPositions);
        mapContainer.removeEventListener("touchmove", updateAllPositions);
      }
    };
  }, [isMultiBuilding, buildings, mapReady, markerVersion]);

  // MULTI-BUILDING: Hover show/hide per building
  useEffect(() => {
    if (!isMultiBuilding) return;

    const buildingsWithFloors = buildings.filter(
      (b) => b.floors && b.floors.length > 1 && b.svgContent
    );

    const cleanups: Array<() => void> = [];

    for (const b of buildingsWithFloors) {
      const wrapper = document.getElementById(
        `svgwrapper-${b.buildingCode}`
      );
      if (!wrapper) continue;

      const code = b.buildingCode;

      const show = (): void => {
        const timer = floorHideTimersRef.current.get(code);
        if (timer) {
          clearTimeout(timer);
          floorHideTimersRef.current.delete(code);
        }
        setFloorSelectors((prev) => {
          const next = new Map(prev);
          const existing = next.get(code);
          if (existing) next.set(code, { ...existing, visible: true });
          return next;
        });
      };

      const scheduleHide = (): void => {
        const timer = setTimeout(() => {
          setFloorSelectors((prev) => {
            const next = new Map(prev);
            const existing = next.get(code);
            if (existing) next.set(code, { ...existing, visible: false });
            return next;
          });
          floorHideTimersRef.current.delete(code);
        }, 2000);
        floorHideTimersRef.current.set(code, timer);
      };

      wrapper.addEventListener("mouseenter", show);
      wrapper.addEventListener("mouseleave", scheduleHide);

      cleanups.push(() => {
        wrapper.removeEventListener("mouseenter", show);
        wrapper.removeEventListener("mouseleave", scheduleHide);
        const timer = floorHideTimersRef.current.get(code);
        if (timer) {
          clearTimeout(timer);
          floorHideTimersRef.current.delete(code);
        }
      });
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [isMultiBuilding, buildings, mapReady, markerVersion]);

  // =========================================================================
  // SINGLE-BUILDING: Process SVG
  // =========================================================================
  useEffect(() => {
    if (isMultiBuilding) return;
    if (!svgContent) {
      processedSvgRef.current = null;
      baseZoomInitializedRef.current = false;
      return;
    }
    const processed = processSvgContent(svgContent);
    processedSvgRef.current = processed;
    stateRef.current.aspectRatio = processed.aspectRatio;
    baseZoomInitializedRef.current = false;
  }, [svgContent, isMultiBuilding]);

  // SINGLE-BUILDING: Create Marker
  useEffect(() => {
    if (isMultiBuilding) return;
    if (!mapRef.current || !mapReady || !processedSvgRef.current) {
      if (svgMarkerRef.current) {
        svgMarkerRef.current.remove();
        svgMarkerRef.current = null;
      }
      return;
    }

    const { content, aspectRatio } = processedSvgRef.current;
    const map = mapRef.current;

    if (!baseZoomInitializedRef.current) {
      baseZoomRef.current = map.getZoom();
      baseZoomInitializedRef.current = true;
    }

    const baseWidth = 200 * scale;
    const baseHeight = baseWidth / aspectRatio;
    // Mirror of the multi-building fix: write the current zoom-derived scale
    // into the initial marker HTML so a remount (e.g., floor change while
    // zoomed) doesn't briefly render at scale(1) before the next zoom event.
    const initialScale = Math.pow(2, map.getZoom() - baseZoomRef.current);

    const icon = L.divIcon({
      className: "svg-marker-wrapper",
      html: `
        <div id="svgwrapper" class="svgwrapper" style="
          width: ${baseWidth}px;
          height: ${baseHeight}px;
          position: relative;
          transform: rotate(${rotation}deg) scale(${initialScale});
          transform-origin: center center;
        ">
          ${content}
        </div>
      `,
      iconSize: [baseWidth, baseHeight],
      iconAnchor: [baseWidth / 2, baseHeight / 2],
    });

    const marker = L.marker(center, {
      icon,
      zIndexOffset: 500,
    });

    if (svgMarkerRef.current) svgMarkerRef.current.remove();
    marker.addTo(map);
    svgMarkerRef.current = marker;

    setMarkerVersion((v) => v + 1);

    const onZoomAnim = (e: L.ZoomAnimEvent) => {
      const el = marker.getElement();
      if (!el) return;
      const inner = el.querySelector(".svgwrapper") as HTMLElement;
      if (!inner) return;

      const scaleFactor = Math.pow(2, e.zoom - baseZoomRef.current);
      inner.style.transform = `rotate(${stateRef.current.rotation}deg) scale(${scaleFactor})`;
    };

    const onZoomEnd = () => {
      const el = marker.getElement();
      if (!el) return;
      const inner = el.querySelector(".svgwrapper") as HTMLElement;
      if (!inner) return;

      const scaleFactor = Math.pow(2, map.getZoom() - baseZoomRef.current);
      inner.style.transform = `rotate(${stateRef.current.rotation}deg) scale(${scaleFactor})`;
    };

    map.on("zoomanim", onZoomAnim);
    map.on("zoomend", onZoomEnd);

    return () => {
      map.off("zoomanim", onZoomAnim);
      map.off("zoomend", onZoomEnd);
    };
  }, [center, scale, rotation, svgContent, mapReady, isMultiBuilding]);

  // =========================================================================
  // SHOP COLORING — works for both modes
  // =========================================================================
  useEffect(() => {
    // Gather all marker elements
    const markerEls: Element[] = [];

    if (isMultiBuilding) {
      for (const [, marker] of markersRef.current) {
        const el = marker.getElement();
        if (el) markerEls.push(el);
      }
    } else {
      if (svgMarkerRef.current) {
        const el = svgMarkerRef.current.getElement();
        if (el) markerEls.push(el);
      }
    }

    if (markerEls.length === 0) return;

    const handle = requestAnimationFrame(() => {
      for (const markerEl of markerEls) {
        const wrapper = markerEl.querySelector(".svgwrapper");
        if (!wrapper) continue;

        const allElements = wrapper.querySelectorAll(
          "path, rect, polygon, polyline, circle, ellipse, g"
        );

        allElements.forEach((el) => {
          const id = el.getAttribute("id");
          if (!id) return;
          if (el.tagName.toLowerCase() === "g" && !el.hasAttribute("id"))
            return;

          el.classList.remove(
            "wm-map-shop",
            "wm-map-shop-active",
            "wm-map-shop-vacant",
            "wm-map-shop-occupied"
          );

          if (shopSvgIds && shopSvgIds.has(id)) {
            if (vacantSvgIds) {
              if (id === activeShopSvgId) {
                el.classList.add("wm-map-shop-active");
                (el as HTMLElement).style.cursor = "pointer";
                (el as HTMLElement).onclick = (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onShopClick?.(id);
                };
              } else if (vacantSvgIds.has(id)) {
                el.classList.add("wm-map-shop-vacant");
                (el as HTMLElement).style.cursor = "pointer";
                (el as HTMLElement).onclick = (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onShopClick?.(id);
                };
              } else {
                el.classList.add("wm-map-shop-occupied");
                (el as HTMLElement).style.cursor = "default";
                (el as HTMLElement).onclick = null;
              }
            } else {
              if (id === activeShopSvgId) {
                el.classList.add("wm-map-shop-active");
              } else {
                el.classList.add("wm-map-shop");
              }

              (el as HTMLElement).style.cursor = "pointer";
              (el as HTMLElement).onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                onShopClick?.(id);
              };
            }

            el.setAttribute("data-path-id", id);
          } else {
            (el as HTMLElement).style.cursor = "";
            (el as HTMLElement).onclick = null;
          }
        });
      }
    });

    return () => cancelAnimationFrame(handle);
  }, [
    shopSvgIds,
    activeShopSvgId,
    onShopClick,
    svgContent,
    buildings,
    mapReady,
    markerVersion,
    vacantSvgIds,
    isMultiBuilding,
  ]);

  // =========================================================================
  // SINGLE-BUILDING: Floor selector position tracking
  // =========================================================================
  useEffect(() => {
    if (isMultiBuilding) return;
    if (!mapReady || !floors || floors.length <= 1) {
      setFloorSelectorPos(null);
      return;
    }

    const updatePos = (): void => {
      const wrapper = document.getElementById("svgwrapper");
      const container = mapContainerRef.current;
      if (!wrapper || !container) {
        setFloorSelectorPos(null);
        return;
      }
      const wrapperRect = wrapper.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setFloorSelectorPos({
        x: wrapperRect.left - containerRect.left,
        y: wrapperRect.top + wrapperRect.height / 2 - containerRect.top,
      });
    };

    updatePos();

    const wrapper = document.getElementById("svgwrapper");
    let resizeObs: ResizeObserver | undefined;
    let paneObs: MutationObserver | undefined;
    let mapContainer: Element | null = null;

    if (wrapper) {
      resizeObs = new ResizeObserver(updatePos);
      resizeObs.observe(wrapper);

      const leafletPane = wrapper.closest(".leaflet-map-pane");
      mapContainer = wrapper.closest(".leaflet-container");

      if (mapContainer) {
        mapContainer.addEventListener("mousemove", updatePos, {
          passive: true,
        });
        mapContainer.addEventListener("touchmove", updatePos, {
          passive: true,
        });
      }
      if (leafletPane) {
        paneObs = new MutationObserver(updatePos);
        paneObs.observe(leafletPane, {
          attributes: true,
          attributeFilter: ["style"],
          subtree: true,
        });
      }
    }

    const bodyObs = new MutationObserver(() => {
      const w = document.getElementById("svgwrapper");
      if (w && !resizeObs) {
        resizeObs = new ResizeObserver(updatePos);
        resizeObs.observe(w);
        updatePos();
      }
    });
    bodyObs.observe(document.body, { childList: true, subtree: true });

    return () => {
      bodyObs.disconnect();
      resizeObs?.disconnect();
      paneObs?.disconnect();
      if (mapContainer) {
        mapContainer.removeEventListener("mousemove", updatePos);
        mapContainer.removeEventListener("touchmove", updatePos);
      }
    };
  }, [mapReady, floors, svgContent, markerVersion, isMultiBuilding]);

  // SINGLE-BUILDING: Hover show/hide
  useEffect(() => {
    if (isMultiBuilding) return;
    if (!floors || floors.length <= 1) return;

    const wrapper = document.getElementById("svgwrapper");
    if (!wrapper) return;

    const show = (): void => {
      if (floorHideTimerRef.current) {
        clearTimeout(floorHideTimerRef.current);
        floorHideTimerRef.current = null;
      }
      setFloorSelectorVisible(true);
    };

    const scheduleHide = (): void => {
      floorHideTimerRef.current = setTimeout(() => {
        setFloorSelectorVisible(false);
      }, 2000);
    };

    wrapper.addEventListener("mouseenter", show);
    wrapper.addEventListener("mouseleave", scheduleHide);

    return () => {
      wrapper.removeEventListener("mouseenter", show);
      wrapper.removeEventListener("mouseleave", scheduleHide);
      if (floorHideTimerRef.current) {
        clearTimeout(floorHideTimerRef.current);
        floorHideTimerRef.current = null;
      }
    };
  }, [floors, svgContent, mapReady, markerVersion, isMultiBuilding]);

  // =========================================================================
  // Cleanup multi-building markers on unmount
  // =========================================================================
  useEffect(() => {
    return () => {
      for (const [, marker] of markersRef.current) {
        marker.remove();
      }
      markersRef.current.clear();
    };
  }, []);

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={mapContainerRef} className="absolute inset-0" />

      {/* Loading overlay */}
      {loading && (
        <div className="bg-muted/30 absolute inset-0 z-[999] flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
            <p className="text-muted-foreground text-sm">{t("loading")}</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {!loading && error && (
        <div className="bg-destructive/5 absolute inset-0 z-[999] flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
          <Store className="text-destructive/50 h-16 w-16" />
          <div>
            <h3 className="text-destructive text-lg font-semibold">
              {t("errorTitle")}
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Empty state overlay */}
      {!loading && !error && !hasAnySvg && (
        <div className="bg-muted/30 absolute inset-0 z-[999] flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
          <Store className="text-muted-foreground/50 h-16 w-16" />
          <div>
            <h3 className="text-lg font-semibold">{t("noMapTitle")}</h3>
            <p className="text-muted-foreground text-sm">
              {t("noMapDescription")}
            </p>
          </div>
        </div>
      )}

      {/* Initializing overlay */}
      {!loading && !error && hasAnySvg && !mapReady && (
        <div className="bg-background/80 absolute inset-0 z-[999] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="text-primary h-6 w-6 animate-spin" />
            <p className="text-muted-foreground text-xs">{t("initializing")}</p>
          </div>
        </div>
      )}

      {/* Selected Products Count Badge */}
      {selectedCount > 0 && (
        <div className="absolute top-4 right-4 z-[1000]">
          <Badge variant="default" className="px-3 py-1.5 text-sm shadow-lg">
            <MapPin className="mr-1 h-4 w-4" />
            {selectedCount} {t("itemsOnMap")}
          </Badge>
        </div>
      )}

      {/* MULTI-BUILDING: Per-building floor selectors */}
      {isMultiBuilding &&
        buildings.map((b) => {
          if (!b.floors || b.floors.length <= 1 || !b.currentFloor || !b.onFloorChange)
            return null;
          const state = floorSelectors.get(b.buildingCode);
          if (!state?.pos) return null;

          return (
            <MapFloorSelector
              key={b.buildingCode}
              floors={b.floors}
              currentFloor={b.currentFloor}
              onFloorChange={b.onFloorChange}
              position={state.pos}
              visible={state.visible}
              onMouseEnter={() => {
                const timer = floorHideTimersRef.current.get(b.buildingCode);
                if (timer) {
                  clearTimeout(timer);
                  floorHideTimersRef.current.delete(b.buildingCode);
                }
                setFloorSelectors((prev) => {
                  const next = new Map(prev);
                  const existing = next.get(b.buildingCode);
                  if (existing)
                    next.set(b.buildingCode, { ...existing, visible: true });
                  return next;
                });
              }}
              onMouseLeave={() => {
                const timer = setTimeout(() => {
                  setFloorSelectors((prev) => {
                    const next = new Map(prev);
                    const existing = next.get(b.buildingCode);
                    if (existing)
                      next.set(b.buildingCode, {
                        ...existing,
                        visible: false,
                      });
                    return next;
                  });
                  floorHideTimersRef.current.delete(b.buildingCode);
                }, 2000);
                floorHideTimersRef.current.set(b.buildingCode, timer);
              }}
            />
          );
        })}

      {/* SINGLE-BUILDING: Floor selector */}
      {!isMultiBuilding &&
        floorSelectorPos &&
        floors &&
        floors.length > 1 &&
        currentFloor &&
        onFloorChange && (
          <MapFloorSelector
            floors={floors}
            currentFloor={currentFloor}
            onFloorChange={onFloorChange}
            position={floorSelectorPos}
            visible={floorSelectorVisible}
            onMouseEnter={() => {
              if (floorHideTimerRef.current) {
                clearTimeout(floorHideTimerRef.current);
                floorHideTimerRef.current = null;
              }
              setFloorSelectorVisible(true);
            }}
            onMouseLeave={() => {
              floorHideTimerRef.current = setTimeout(
                () => setFloorSelectorVisible(false),
                2000
              );
            }}
          />
        )}
    </div>
  );
});

export default LeafletMapView;
