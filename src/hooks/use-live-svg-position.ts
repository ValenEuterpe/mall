"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Tracks the live viewport position of an SVG element by id while the user
 * pans/zooms the Leaflet map. Mirrors the observer wiring in
 * `ShopPinOverlay.computeShopPositions` so popups stay glued to their shop.
 *
 * Returns null when no svgId is provided or the element can't be found.
 *
 * Why a hook vs. baking the position into useShopPopup state:
 * - The shop element's screen position changes continuously as the user pans.
 * - Storing {x,y} once (the original useShopPopup behavior) freezes the popup
 *   at click-time coordinates, so it drifts away when the map moves.
 * - This hook re-measures on every Leaflet pane mutation, container
 *   mousemove/touchmove, and wrapper resize — matching the observer set used
 *   by ShopPinOverlay so the two popup types feel identical to the user.
 */
export function useLiveSvgPosition(
  svgId: string | null
): { x: number; y: number } | null {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null
  );

  const measure = useCallback((): void => {
    if (!svgId) {
      setPosition(null);
      return;
    }

    let escaped: string;
    try {
      escaped = CSS.escape(svgId);
    } catch {
      escaped = svgId;
    }

    let el: Element | null = null;
    const wrappers = document.querySelectorAll<HTMLElement>(".svgwrapper");
    for (const wrapper of wrappers) {
      el =
        wrapper.querySelector(`svg [id="${escaped}"]`) ||
        wrapper.querySelector(`[id="${escaped}"]`);
      if (el) break;
    }

    if (!el) {
      setPosition(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setPosition(null);
      return;
    }

    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }, [svgId]);

  useEffect(() => {
    if (!svgId) {
      setPosition(null);
      return;
    }

    measure();

    let resizeObs: ResizeObserver | undefined;
    let paneObs: MutationObserver | undefined;
    const mapContainers = new Set<Element>();
    const observedWrappers = new Set<HTMLElement>();
    const observedPanes = new Set<Element>();

    const onPanZoom = (): void => measure();

    function attach(wrapper: HTMLElement): void {
      if (observedWrappers.has(wrapper)) return;
      observedWrappers.add(wrapper);

      if (!resizeObs) resizeObs = new ResizeObserver(() => measure());
      resizeObs.observe(wrapper);

      const pane = wrapper.closest(".leaflet-map-pane");
      if (pane && !observedPanes.has(pane)) {
        observedPanes.add(pane);
        if (!paneObs) paneObs = new MutationObserver(() => measure());
        paneObs.observe(pane, {
          attributes: true,
          attributeFilter: ["style"],
          subtree: true,
        });
      }

      const container = wrapper.closest(".leaflet-container");
      if (container && !mapContainers.has(container)) {
        mapContainers.add(container);
        container.addEventListener("mousemove", onPanZoom, { passive: true });
        container.addEventListener("touchmove", onPanZoom, { passive: true });
      }
    }

    document
      .querySelectorAll<HTMLElement>(".svgwrapper")
      .forEach((w) => attach(w));

    const bodyObserver = new MutationObserver(() => {
      document
        .querySelectorAll<HTMLElement>(".svgwrapper")
        .forEach((w) => attach(w));
      measure();
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      bodyObserver.disconnect();
      resizeObs?.disconnect();
      paneObs?.disconnect();
      mapContainers.forEach((c) => {
        c.removeEventListener("mousemove", onPanZoom);
        c.removeEventListener("touchmove", onPanZoom);
      });
    };
  }, [svgId, measure]);

  return position;
}
