"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

interface FloorMap {
  id: string;
  svgUrl: string;
  shopIds: string[];
}

interface Floor {
  id: string;
  number: number;
  label?: string | null;
  code: string;
  floorMap: FloorMap | null;
  _count?: { shops: number };
}

interface Building {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  rotation: number;
  scale: number;
  floors: Floor[];
}

interface Venue {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  rotation: number;
  scale: number;
  svgUrl?: string | null;
  shopIds: string[];
}

// Shop assignment types
interface ShopAssignment {
  shopId: string;
  shopCode: string;
  svgId: string | null;
  sellerId: string | null; // Used to determine if shop is occupied (red) or vacant (green)
}

interface MapViewProps {
  center: [number, number];
  position: { lat: number; lng: number } | null;
  rotation: number;
  scale: number;
  onPositionChange: (pos: { lat: number; lng: number }) => void;
  onRotationChange: (rotation: number) => void;
  onScaleChange: (scale: number) => void;
  selectedBuilding: Building | null;
  selectedVenue: Venue | null;
  selectedFloor: Floor | null;
  onFloorChange: (floor: Floor | null) => void;
  isEditMode: boolean;
  showOtherFloors: boolean;
  dialogOpen?: boolean;
  shopAssignmentMode?: boolean;
  shopAssignments?: ShopAssignment[];
  selectedShopForAssignment?: string | null;
  onPathClick?: (pathId: string) => void;
}

export function MapView({
  center,
  position,
  rotation,
  scale,
  onPositionChange,
  onRotationChange,
  onScaleChange,
  selectedBuilding,
  selectedVenue,
  selectedFloor,
  onFloorChange,
  isEditMode,
  showOtherFloors,
  dialogOpen = false,
  shopAssignmentMode = false,
  shopAssignments = [],
  selectedShopForAssignment = null,
  onPathClick,
}: MapViewProps) {
  const t = useTranslations("mapEditor.mapView");
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgMarkerRef = useRef<L.Marker | null>(null);
  const otherMarkersRef = useRef<L.Marker[]>([]);

  // Counter to trigger coloring effect when marker is recreated
  const [markerVersion, setMarkerVersion] = useState(0);

  // Ref to track current props without triggering re-renders in event handlers
  const stateRef = useRef({
    scale,
    rotation,
    position,
    aspectRatio: 1,
    isEditMode,
  });

  useEffect(() => {
    stateRef.current = {
      scale,
      rotation,
      position,
      aspectRatio: stateRef.current.aspectRatio,
      isEditMode,
    };
  }, [scale, rotation, position, isEditMode]);

  const baseZoomRef = useRef<number>(18);
  const baseZoomInitializedRef = useRef<boolean>(false); // Track if baseZoom was initialized for current SVG
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const processedSvgRef = useRef<{
    content: string;
    aspectRatio: number;
  } | null>(null);

  // Get current SVG URL based on selection
  const getCurrentSvgUrl = useCallback((): string | null => {
    if (selectedBuilding && selectedFloor !== null) {
      return selectedFloor.floorMap?.svgUrl || null;
    }
    if (selectedVenue) {
      return selectedVenue.svgUrl || null;
    }
    return null;
  }, [selectedBuilding, selectedVenue, selectedFloor]);

  // Get other floor SVGs
  const getOtherFloorSvgs = useCallback((): {
    floor: number;
    svgUrl: string;
  }[] => {
    if (!selectedBuilding || selectedFloor === null || !showOtherFloors)
      return [];
    return selectedBuilding.floors
      .filter((f) => f.id !== selectedFloor.id && f.floorMap?.svgUrl)
      .map((f) => ({ floor: f.number, svgUrl: f.floorMap!.svgUrl }));
  }, [selectedBuilding, selectedFloor, showOtherFloors]);

  // Fetch SVG content
  const fetchSvgContent = useCallback(
    async (url: string): Promise<string | null> => {
      try {
        const response = await fetch(url);
        return await response.text();
      } catch (error) {
        console.error("Failed to fetch SVG:", error);
        return null;
      }
    },
    []
  );

  // Process SVG content with tight bounding box - strictly following HTML fix
  // Also applies shop assignment coloring when in assignment mode
  const processSvgContent = useCallback(
    (
      content: string,
      applyAssignmentColors: boolean = false,
      assignments: ShopAssignment[] = [],
      selectedShopId: string | null = null
    ): { content: string; aspectRatio: number; pathIds: string[] } => {
      const measureLayer = document.createElement("div");
      // Ensure measure layer styles match the HTML fix for accurate bbox
      measureLayer.style.cssText =
        "position: absolute; visibility: hidden; pointer-events: none;";
      document.body.appendChild(measureLayer);
      measureLayer.innerHTML = content;

      const svgEl = measureLayer.querySelector("svg");
      const pathIds: string[] = [];

      if (svgEl) {
        try {
          const bbox = svgEl.getBBox();

          // Redefine the viewBox to match exactly the content bounds
          svgEl.setAttribute(
            "viewBox",
            `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`
          );
          svgEl.setAttribute("width", "100%");
          svgEl.setAttribute("height", "100%");
          svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");

          // Find all clickable elements (paths, rects, polygons, etc. with IDs)
          if (applyAssignmentColors) {
            const clickableElements = svgEl.querySelectorAll("[id]");
            const assignedPathIds = new Set(
              assignments.filter((a) => a.svgId).map((a) => a.svgId!)
            );
            const selectedShopSvgId = assignments.find(
              (a) => a.shopId === selectedShopId
            )?.svgId;

            clickableElements.forEach((el) => {
              const id = el.getAttribute("id");
              if (!id) return;

              // Skip non-shape elements
              const tagName = el.tagName.toLowerCase();
              if (
                ![
                  "path",
                  "rect",
                  "polygon",
                  "polyline",
                  "circle",
                  "ellipse",
                  "g",
                ].includes(tagName)
              ) {
                return;
              }

              pathIds.push(id);

              // Store original styles
              const originalFill = el.getAttribute("fill") || "";
              const originalStroke = el.getAttribute("stroke") || "";
              el.setAttribute("data-original-fill", originalFill);
              el.setAttribute("data-original-stroke", originalStroke);
              el.setAttribute("data-path-id", id);

              // Apply coloring based on assignment status
              if (id === selectedShopSvgId) {
                // This path belongs to the currently selected shop - blue
                el.setAttribute("fill", "rgba(59, 130, 246, 0.4)");
                el.setAttribute("stroke", "#3b82f6");
                el.setAttribute("stroke-width", "2");
              } else if (assignedPathIds.has(id)) {
                // Already assigned to another shop - red
                el.setAttribute("fill", "rgba(239, 68, 68, 0.3)");
                el.setAttribute("stroke", "#ef4444");
                el.setAttribute("stroke-width", "1");
              } else {
                // Available/unassigned - green
                el.setAttribute("fill", "rgba(34, 197, 94, 0.3)");
                el.setAttribute("stroke", "#22c55e");
                el.setAttribute("stroke-width", "1");
              }

              // Add cursor and hover class
              el.setAttribute("style", "cursor: pointer;");
              el.classList.add("svg-clickable-path");
            });
          }

          const processedContent = new XMLSerializer().serializeToString(svgEl);
          const aspectRatio = bbox.width / bbox.height;

          document.body.removeChild(measureLayer);
          return { content: processedContent, aspectRatio, pathIds };
        } catch (_e) {
          // Fallback
          document.body.removeChild(measureLayer);
          svgEl.setAttribute("width", "100%");
          svgEl.setAttribute("height", "100%");
          return { content: content, aspectRatio: 1, pathIds: [] };
        }
      }

      document.body.removeChild(measureLayer);
      return { content, aspectRatio: 1, pathIds: [] };
    },
    []
  );

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: center,
      zoom: 18,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      maxZoom: 22,
      attribution: "",
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Center map on initial mount only
  const initialCenterDoneRef = useRef(false);
  useEffect(() => {
    if (mapRef.current && center && !initialCenterDoneRef.current) {
      initialCenterDoneRef.current = true;
      mapRef.current.setView(center, mapRef.current.getZoom());
    }
  }, [center]);

  // Load SVG
  useEffect(() => {
    const svgUrl = getCurrentSvgUrl();
    if (!svgUrl) {
      setSvgContent(null);
      return;
    }

    fetchSvgContent(svgUrl).then((content) => {
      if (content) {
        setSvgContent(content);
      }
    });
  }, [getCurrentSvgUrl, fetchSvgContent]);

  // Process SVG - only reprocess when the actual SVG content changes, not assignment coloring
  useEffect(() => {
    if (!svgContent) {
      processedSvgRef.current = null;
      baseZoomInitializedRef.current = false; // Reset when SVG is cleared
      return;
    }
    // Process without assignment colors - coloring is applied dynamically in the marker effect
    const processed = processSvgContent(svgContent, false, [], null);
    processedSvgRef.current = processed;
    stateRef.current.aspectRatio = processed.aspectRatio;
    baseZoomInitializedRef.current = false; // Reset to capture new base zoom for new SVG
  }, [svgContent, processSvgContent]);

  // Create Marker with Layout based on HTML Fix (Internal Handles)
  useEffect(() => {
    if (!mapRef.current || !position || !processedSvgRef.current) {
      if (svgMarkerRef.current) {
        svgMarkerRef.current.remove();
        svgMarkerRef.current = null;
      }
      return;
    }

    const { content, aspectRatio } = processedSvgRef.current;
    const map = mapRef.current;

    // Only capture base zoom once per SVG to prevent resize on mode switches
    if (!baseZoomInitializedRef.current) {
      baseZoomRef.current = map.getZoom();
      baseZoomInitializedRef.current = true;
    }

    // 200px base reference size logic from original
    const baseWidth = 200 * scale;
    const baseHeight = baseWidth / aspectRatio;

    let handlesHtml = "";
    if (isEditMode) {
      // Using data attributes to identify handles
      handlesHtml = `
            <div class="resize-handle handle-nw" data-dir="nw" style="top: -6px; left: -6px; cursor: nwse-resize;"></div>
            <div class="resize-handle handle-ne" data-dir="ne" style="top: -6px; right: -6px; cursor: nesw-resize;"></div>
            <div class="resize-handle handle-sw" data-dir="sw" style="bottom: -6px; left: -6px; cursor: nesw-resize;"></div>
            <div class="resize-handle handle-se" data-dir="se" style="bottom: -6px; right: -6px; cursor: nwse-resize;"></div>
            
            <div class="resize-handle handle-n" data-dir="n" style="top: -5px; left: 50%; transform: translateX(-50%); cursor: ns-resize;"></div>
            <div class="resize-handle handle-s" data-dir="s" style="bottom: -5px; left: 50%; transform: translateX(-50%); cursor: ns-resize;"></div>
            <div class="resize-handle handle-w" data-dir="w" style="top: 50%; left: -5px; transform: translateY(-50%); cursor: ew-resize;"></div>
            <div class="resize-handle handle-e" data-dir="e" style="top: 50%; right: -5px; transform: translateY(-50%); cursor: ew-resize;"></div>

            <div class="rotate-handle" style="top: -40px; left: 50%; transform: translateX(-50%);"></div>
        `;
    }

    const activeClass = isEditMode ? "svg-overlay-active" : "";
    // Border style strictly from HTML/Requirement
    const borderStyle = isEditMode
      ? "outline: 2px dashed #3b82f6; background: rgba(59, 130, 246, 0.05);"
      : "";

    const icon = L.divIcon({
      className: "svg-marker-wrapper",
      html: `
        <div id="svgwrapper" class="${activeClass}" style="
          width: ${baseWidth}px; 
          height: ${baseHeight}px; 
          position: relative;
          transform: rotate(${rotation}deg);
          transform-origin: center center;
          ${borderStyle}
        ">
          ${content}
          ${handlesHtml}
        </div>
      `,
      iconSize: [baseWidth, baseHeight],
      iconAnchor: [baseWidth / 2, baseHeight / 2],
    });

    const marker = L.marker([position.lat, position.lng], {
      icon,
      draggable: isEditMode,
      zIndexOffset: 500,
    });

    if (svgMarkerRef.current) svgMarkerRef.current.remove();
    marker.addTo(map);
    svgMarkerRef.current = marker;

    // Trigger coloring effect to re-run after marker is created
    setMarkerVersion((v) => v + 1);

    // Direct DOM Event Listeners for smooth manipulation
    setTimeout(() => {
      const wrapper = document.getElementById("svgwrapper");
      if (!wrapper) return;

      // Shop assignment mode: Add click listeners to SVG paths
      if (shopAssignmentMode && onPathClick) {
        const clickableElements = wrapper.querySelectorAll("[data-path-id]");
        clickableElements.forEach((el) => {
          const pathId = el.getAttribute("data-path-id");
          if (pathId) {
            (el as HTMLElement).onclick = (e) => {
              e.stopPropagation();
              e.preventDefault();
              onPathClick(pathId);
            };
          }
        });
      }

      if (!isEditMode) return;

      const setupHandle = (
        selector: string,
        handler: (e: MouseEvent) => void
      ) => {
        const el = wrapper.querySelector(selector) as HTMLElement;
        if (el) {
          el.onmousedown = (e) => {
            e.stopPropagation();
            e.preventDefault();
            handler(e);
          };
        }
      };

      // Resize Logic
      const handleResize = (e: MouseEvent, dir: string) => {
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = parseFloat(wrapper.style.width);
        const startHeight = parseFloat(wrapper.style.height);
        let lastTx = 0;
        let lastTy = 0;

        const onMouseMove = (me: MouseEvent) => {
          const dx = me.clientX - startX;
          const dy = me.clientY - startY;

          let newW = startWidth;
          let newH = startHeight;

          // Assuming "all sides" means scaling from any handle
          if (dir.includes("e")) newW = startWidth + dx;
          if (dir.includes("w")) newW = startWidth - dx;
          if (dir.includes("s")) newH = startHeight + dy;
          if (dir.includes("n")) newH = startHeight - dy;

          const ar = stateRef.current.aspectRatio;

          // Driven logic
          if (dir === "n" || dir === "s") {
            newW = newH * ar;
          } else {
            newH = newW / ar;
          }

          newW = Math.max(40, newW);
          newH = Math.max(40, newH);

          wrapper.style.width = `${newW}px`;
          wrapper.style.height = `${newH}px`;

          // Apply Translation to keep opposite edge fixed visually
          let tx = 0,
            ty = 0;
          const wDiff = newW - startWidth;
          const hDiff = newH - startHeight;

          if (dir.includes("w")) tx = -wDiff / 2;
          if (dir.includes("e")) tx = wDiff / 2;
          if (dir.includes("n")) ty = -hDiff / 2;
          if (dir.includes("s")) ty = hDiff / 2;

          wrapper.style.transform = `rotate(${stateRef.current.rotation}deg) translate(${tx}px, ${ty}px)`;

          lastTx = tx;
          lastTy = ty;
        };

        const onMouseUp = () => {
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);

          const finalW = parseFloat(wrapper.style.width);
          const newScale = finalW / 200;

          const tx = lastTx;
          const ty = lastTy;

          if (tx !== 0 || ty !== 0) {
            const currentPos = stateRef.current.position;
            if (currentPos && mapRef.current) {
              const centerPoint =
                mapRef.current.latLngToContainerPoint(currentPos);
              const newCenterPoint = centerPoint.add([tx, ty]);
              const newLatLng =
                mapRef.current.containerPointToLatLng(newCenterPoint);
              onPositionChange(newLatLng);
            }
          }

          onScaleChange(newScale);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      };

      ["nw", "ne", "sw", "se", "n", "s", "e", "w"].forEach((dir) => {
        setupHandle(`.handle-${dir}`, (e) => handleResize(e, dir));
      });

      // Rotation Logic
      setupHandle(".rotate-handle", (_e) => {
        const rect = wrapper.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        let lastRot: number | undefined;

        const onMouseMove = (me: MouseEvent) => {
          const angle =
            Math.atan2(me.clientY - cy, me.clientX - cx) * (180 / Math.PI);
          const rot = ((Math.round(angle + 90) % 360) + 360) % 360;
          wrapper.style.transform = `rotate(${rot}deg)`;
          lastRot = rot;
        };

        const onMouseUp = () => {
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);
          if (lastRot !== undefined) {
            onRotationChange(lastRot);
          }
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });
    }, 50);

    // Draggable Marker Event
    marker.on("dragend", (e) => {
      const latlng = e.target.getLatLng();
      onPositionChange({ lat: latlng.lat, lng: latlng.lng });
    });

    // Smooth Zoom Logic (CSS + Listener)
    const onZoomAnim = (e: L.ZoomAnimEvent) => {
      const el = marker.getElement();
      if (!el) return;
      const inner = el.querySelector("#svgwrapper") as HTMLElement;
      if (!inner) return;

      const scaleFactor = Math.pow(2, e.zoom - baseZoomRef.current);
      inner.style.transform = `rotate(${rotation}deg) scale(${scaleFactor})`;
    };

    const onZoomEnd = () => {
      const el = marker.getElement();
      if (!el) return;
      const inner = el.querySelector("#svgwrapper") as HTMLElement;
      if (!inner) return;

      const scaleFactor = Math.pow(2, map.getZoom() - baseZoomRef.current);
      inner.style.transform = `rotate(${rotation}deg) scale(${scaleFactor})`;
    };

    map.on("zoomanim", onZoomAnim);
    map.on("zoomend", onZoomEnd);

    return () => {
      map.off("zoomanim", onZoomAnim);
      map.off("zoomend", onZoomEnd);
    };
  }, [
    position,
    scale,
    rotation,
    isEditMode,
    svgContent,
    onPositionChange,
    onRotationChange,
    onScaleChange,
  ]);

  // Apply shop assignment coloring and click handlers
  useEffect(() => {
    if (!svgMarkerRef.current) return;

    // Use requestAnimationFrame to ensure the Leaflet marker DOM is ready
    const handle = requestAnimationFrame(() => {
      const markerEl = svgMarkerRef.current?.getElement();
      if (!markerEl) return;

      const wrapper = markerEl.querySelector("#svgwrapper");
      if (!wrapper) return;

      // Build a set of svgIds that are already assigned to shops
      const assignedSvgIds = new Set<string>();
      shopAssignments.forEach((a) => {
        if (a.svgId) assignedSvgIds.add(a.svgId);
      });

      const selectedShopSvgId = shopAssignments.find(
        (a) => a.shopId === selectedShopForAssignment
      )?.svgId;

      // Find all interactive elements
      const allElements = wrapper.querySelectorAll(
        "path, rect, polygon, polyline, circle, ellipse, g"
      );

      allElements.forEach((el) => {
        const id = el.getAttribute("id");
        if (!id) return;

        // Skip non-interactive groups
        if (el.tagName.toLowerCase() === "g" && !el.hasAttribute("id")) return;

        if (shopAssignmentMode) {
          // Remove old classes first
          el.classList.remove(
            "wm-map-assigned",
            "wm-map-unassigned",
            "wm-map-active"
          );

          if (id === selectedShopSvgId) {
            el.classList.add("wm-map-active");
          } else if (assignedSvgIds.has(id)) {
            el.classList.add("wm-map-assigned");
          } else {
            el.classList.add("wm-map-unassigned");
          }

          // Setup interaction
          (el as HTMLElement).style.cursor = "pointer";
          el.setAttribute("data-path-id", id);
          (el as HTMLElement).onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            onPathClick?.(id);
          };
        } else {
          // Reset when not in assignment mode
          el.classList.remove(
            "wm-map-assigned",
            "wm-map-unassigned",
            "wm-map-active"
          );
          (el as HTMLElement).style.cursor = "";
          (el as HTMLElement).onclick = null;
        }
      });
    });

    return () => cancelAnimationFrame(handle);
  }, [
    shopAssignmentMode,
    shopAssignments,
    selectedShopForAssignment,
    onPathClick,
    position,
    rotation,
    scale,
    svgContent,
    markerVersion,
  ]);

  // Restored: Render other floor overlays
  useEffect(() => {
    if (!mapRef.current || !position) return;

    const map = mapRef.current;

    // Clear existing
    otherMarkersRef.current.forEach((marker) => marker.remove());
    otherMarkersRef.current = [];

    if (!showOtherFloors || !selectedBuilding) return;

    const otherFloors = getOtherFloorSvgs();
    const currentBaseZoom = map.getZoom(); // Use current zoom as base for others

    otherFloors.forEach(async ({ svgUrl }) => {
      const content = await fetchSvgContent(svgUrl);
      if (!content || !mapRef.current) return;

      const processed = processSvgContent(content);
      const baseWidth = 200 * scale;
      const baseHeight = baseWidth / processed.aspectRatio;

      const icon = L.divIcon({
        className: "svg-overlay-marker-other",
        html: `
          <div class="svg-inner-scaler-other" style="
            width: ${baseWidth}px;
            height: ${baseHeight}px;
            transform-origin: center center;
          ">
            <div class="svg-content-container" style="
              width: 100%;
              height: 100%;
              transform: rotate(${rotation}deg);
              opacity: 0.3;
              filter: grayscale(50%);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              ${processed.content}
            </div>
          </div>
        `,
        iconSize: [baseWidth, baseHeight],
        iconAnchor: [baseWidth / 2, baseHeight / 2],
      });

      const marker = L.marker([position.lat, position.lng], {
        icon,
        interactive: false,
        zIndexOffset: 400,
      });

      marker.addTo(map);
      otherMarkersRef.current.push(marker);

      // Simple zoom handler for others
      const onZoomAnim = (e: L.ZoomAnimEvent) => {
        const el = marker.getElement();
        if (!el) return;
        const inner = el.querySelector(
          ".svg-inner-scaler-other"
        ) as HTMLElement;
        if (!inner) return;

        const zoomScale = Math.pow(2, e.zoom - currentBaseZoom);
        inner.style.transform = `scale(${zoomScale})`;
      };

      const onZoomEnd = () => {
        const el = marker.getElement();
        if (!el) return;
        const inner = el.querySelector(
          ".svg-inner-scaler-other"
        ) as HTMLElement;
        if (!inner) return;

        const zoomScale = Math.pow(2, map.getZoom() - currentBaseZoom);
        inner.style.transform = `scale(${zoomScale})`;
      };

      map.on("zoomanim", onZoomAnim);
      map.on("zoomend", onZoomEnd);
    });

    return () => {
      otherMarkersRef.current.forEach((marker) => marker.remove());
      otherMarkersRef.current = [];
    };
  }, [
    showOtherFloors,
    selectedBuilding,
    position,
    rotation,
    scale,
    getOtherFloorSvgs,
    fetchSvgContent,
    processSvgContent,
  ]);

  return (
    <div className="relative h-full w-full">
      <style jsx global>{`
        .leaflet-zoom-anim .leaflet-zoom-animated {
          transition: transform 0.25s cubic-bezier(0, 0, 0.25, 1);
        }
        .svg-marker-wrapper {
          background: transparent;
          border: none;
        }
        .resize-handle {
          width: 12px;
          height: 12px;
          background: #3b82f6;
          border: 2px solid white;
          border-radius: 50%;
          position: absolute;
          z-index: 100;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        .rotate-handle {
          width: 14px;
          height: 14px;
          background: #22c55e;
          border: 2px solid white;
          border-radius: 50%;
          position: absolute;
          cursor: pointer;
          z-index: 100;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        .rotate-handle::after {
          content: "";
          position: absolute;
          top: 14px;
          left: 50%;
          width: 2px;
          height: 20px;
          background: #22c55e;
          transform: translateX(-50%);
          z-index: -1;
        }
        .svg-clickable-path {
          transition: opacity 0.15s ease;
        }
        .svg-clickable-path:hover {
          opacity: 0.8;
          filter: brightness(1.1);
        }

        /* Shop assignment coloring */
        .wm-map-unassigned {
          fill: rgba(34, 197, 94, 0.3) !important;
          stroke: #22c55e !important;
          stroke-width: 1 !important;
        }
        .wm-map-assigned {
          fill: rgba(239, 68, 68, 0.3) !important;
          stroke: #ef4444 !important;
          stroke-width: 1 !important;
        }
        .wm-map-active {
          fill: rgba(59, 130, 246, 0.4) !important;
          stroke: #3b82f6 !important;
          stroke-width: 2 !important;
        }
        .wm-map-unassigned:hover,
        .wm-map-assigned:hover,
        .wm-map-active:hover {
          opacity: 0.8;
          filter: brightness(1.1);
        }
      `}</style>

      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ minHeight: "400px" }}
      />

      {/* Restored UI Indicators */}
      {selectedBuilding && selectedBuilding.floors.length > 0 && (
        <div
          className={`absolute top-3 left-16 z-[1000] rounded-lg bg-white p-2 shadow-lg transition-opacity ${dialogOpen ? "pointer-events-none opacity-50" : ""}`}
        >
          <select
            value={selectedFloor?.id ?? ""}
            onChange={(e) => {
              const floor = selectedBuilding.floors.find(
                (f) => f.id === e.target.value
              );
              onFloorChange(floor || null);
            }}
            className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">{t("selectFloor")}</option>
            {selectedBuilding.floors.map((floor) => (
              <option key={floor.id} value={floor.id}>
                {floor.code}
                {floor.label ? ` (${floor.label})` : ""}
                {floor.floorMap ? " ✓" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {isEditMode && (selectedBuilding || selectedVenue) && (
        <div className="absolute top-3 right-3 z-[1000] rounded-full bg-blue-500 px-3 py-1 text-sm font-medium text-white shadow-lg">
          {t("editMode")}
        </div>
      )}

      {!isEditMode && (selectedBuilding || selectedVenue) && svgContent && (
        <div className="absolute top-3 right-3 z-[1000] rounded-full bg-green-500 px-3 py-1 text-sm font-medium text-white shadow-lg">
          {t("previewMode")}
        </div>
      )}

      {!svgContent && isEditMode && (selectedBuilding || selectedVenue) && (
        <div className="absolute right-3 bottom-3 z-[1000] rounded-lg bg-amber-500 px-3 py-2 text-sm text-white shadow-lg">
          {selectedBuilding ? t("selectFloorOrUpload") : t("uploadSvg")}
        </div>
      )}

      {isEditMode && svgContent && (
        <div className="absolute bottom-3 left-3 z-[1000] space-y-0.5 rounded-lg bg-white/90 p-2 text-xs text-gray-600 shadow-lg backdrop-blur">
          <p>{t("helpMove")}</p>
          <p>{t("helpResize")}</p>
          <p>{t("helpRotate")}</p>
        </div>
      )}
    </div>
  );
}

export default MapView;
