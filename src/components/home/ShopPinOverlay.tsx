"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { ShopPin } from "./ShopPin";
import { PinCarousel } from "./PinCarousel";

interface ShopPinData {
  productId: string;
  svgId: string;
  thumbnail: string;
  name: string;
  price?: number;
  shopName?: string;
}

interface MapShop {
  id: string;
  fullCode: string;
  svgId: string | null;
  shopName: string | null;
  description: string | null;
  imageUrl: string | null;
  isVacant: boolean;
}

interface ShopPinOverlayProps {
  productPins: ShopPinData[];
  shopsBySvgId: Map<string, MapShop>;
  onRemoveProduct: (productId: string) => void;
  onViewProduct: (productId: string) => void;
}

interface PinPosition {
  svgId: string;
  pins: ShopPinData[];
  x: number;
  y: number;
}

function computeShopPositions(
  svgWrapper: HTMLElement,
  productPins: ShopPinData[]
): PinPosition[] {
  const svg = svgWrapper.querySelector("svg");
  if (!svg) return [];

  const grouped = new Map<string, ShopPinData[]>();
  for (const pin of productPins) {
    const arr = grouped.get(pin.svgId) || [];
    arr.push(pin);
    grouped.set(pin.svgId, arr);
  }

  const positions: PinPosition[] = [];
  for (const [svgId, pins] of grouped) {
    let el: Element | null;
    try {
      el = svg.querySelector(`[id="${CSS.escape(svgId)}"]`);
    } catch {
      el = svg.querySelector(`[id="${svgId}"]`);
    }
    if (!el) continue;

    // Use getBoundingClientRect to get screen coordinates directly.
    // This accounts for all Leaflet transforms (zoom, pan, scale).
    const rect = el.getBoundingClientRect();
    const screenX = rect.left + rect.width / 2;
    const screenY = rect.top + rect.height / 2;

    positions.push({ svgId, pins, x: screenX, y: screenY });
  }

  return positions;
}

export const ShopPinOverlay = memo(function ShopPinOverlay({
  productPins,
  shopsBySvgId,
  onRemoveProduct,
  onViewProduct,
}: ShopPinOverlayProps) {
  const [positions, setPositions] = useState<PinPosition[]>([]);
  const [activeSvgId, setActiveSvgId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePositions = useCallback(() => {
    if (productPins.length === 0) {
      setPositions([]);
      return;
    }
    // Search across all building wrappers (multi-building support)
    const wrappers = document.querySelectorAll<HTMLElement>(".svgwrapper");
    if (wrappers.length === 0) {
      setPositions([]);
      return;
    }
    let allPos: PinPosition[] = [];
    wrappers.forEach((wrapper) => {
      const pos = computeShopPositions(wrapper, productPins);
      allPos = allPos.concat(pos);
    });
    setPositions(allPos);
  }, [productPins]);

  useEffect(() => {
    updatePositions();
  }, [updatePositions]);

  // Watch for #svgwrapper appearing in the DOM (it's created async by Leaflet
  // marker), then attach resize/mutation/pan observers for position tracking.
  useEffect(() => {
    let resizeObs: ResizeObserver | undefined;
    let mutationObs: MutationObserver | undefined;
    let paneObs: MutationObserver | undefined;
    let mapContainer: Element | null = null;
    const panZoomHandler = () => updatePositions();

    function attachObservers(wrapper: HTMLElement): void {
      if (!resizeObs) {
        resizeObs = new ResizeObserver(() => updatePositions());
      }
      resizeObs.observe(wrapper);

      if (!mutationObs) {
        mutationObs = new MutationObserver(() => updatePositions());
      }
      mutationObs.observe(wrapper, { childList: true, subtree: true });

      const leafletPane = wrapper.closest(".leaflet-map-pane");
      if (!mapContainer) {
        mapContainer = wrapper.closest(".leaflet-container");
        if (mapContainer) {
          mapContainer.addEventListener("mousemove", panZoomHandler, {
            passive: true,
          });
          mapContainer.addEventListener("touchmove", panZoomHandler, {
            passive: true,
          });
        }
      }

      if (leafletPane && !paneObs) {
        paneObs = new MutationObserver(() => updatePositions());
        paneObs.observe(leafletPane, {
          attributes: true,
          attributeFilter: ["style"],
          subtree: true,
        });
      }

      updatePositions();
    }

    // Check if wrappers already exist (supports multiple buildings)
    const existing = document.querySelectorAll<HTMLElement>(".svgwrapper");
    existing.forEach((wrapper) => attachObservers(wrapper));

    // Watch for wrappers appearing/changing in the DOM
    const bodyObserver = new MutationObserver(() => {
      const wrappers = document.querySelectorAll<HTMLElement>(".svgwrapper");
      wrappers.forEach((wrapper) => {
        // Only attach if not already observed (resizeObs exists but wrapper might be new)
        if (!resizeObs) {
          attachObservers(wrapper);
        } else {
          resizeObs.observe(wrapper);
        }
      });
      if (wrappers.length > 0) updatePositions();
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      bodyObserver.disconnect();
      resizeObs?.disconnect();
      mutationObs?.disconnect();
      paneObs?.disconnect();
      if (mapContainer) {
        mapContainer.removeEventListener("mousemove", panZoomHandler);
        mapContainer.removeEventListener("touchmove", panZoomHandler);
      }
    };
  }, [updatePositions]);

  const activePin = positions.find((p) => p.svgId === activeSvgId);

  const handlePinClick = useCallback((svgId: string) => {
    setActiveSvgId((prev) => (prev === svgId ? null : svgId));
  }, []);

  const handleCloseCarousel = useCallback(() => {
    setActiveSvgId(null);
  }, []);

  const handleRemoveProduct = useCallback(
    (productId: string) => {
      onRemoveProduct(productId);
    },
    [onRemoveProduct]
  );

  const handleViewProduct = useCallback(
    (productId: string) => {
      onViewProduct(productId);
      setActiveSvgId(null);
    },
    [onViewProduct]
  );

  const handleRemoveLast = useCallback(
    (svgId: string) => {
      const pinGroup = productPins.filter((p) => p.svgId === svgId);
      if (pinGroup.length > 0) {
        onRemoveProduct(pinGroup[pinGroup.length - 1].productId);
      }
    },
    [productPins, onRemoveProduct]
  );

  return (
    <div ref={containerRef} className="pointer-events-none fixed inset-0 z-40">
      {positions.map((pos) => (
        <div key={pos.svgId} className="pointer-events-auto">
          <ShopPin
            pins={pos.pins}
            position={{ x: pos.x, y: pos.y }}
            onClick={() => handlePinClick(pos.svgId)}
            onRemoveLast={() => handleRemoveLast(pos.svgId)}
          />
        </div>
      ))}

      {activePin && (
        <div className="pointer-events-auto">
          <PinCarousel
            pins={activePin.pins}
            shopName={shopsBySvgId.get(activePin.svgId)?.shopName || "Shop"}
            shopCode={shopsBySvgId.get(activePin.svgId)?.fullCode}
            shopImageUrl={
              shopsBySvgId.get(activePin.svgId)?.imageUrl || undefined
            }
            position={{ x: activePin.x, y: activePin.y }}
            onClose={handleCloseCarousel}
            onRemoveProduct={handleRemoveProduct}
            onViewProduct={handleViewProduct}
          />
        </div>
      )}
    </div>
  );
});
