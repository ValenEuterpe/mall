"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";

// ============================================================================
// Types
// ============================================================================

export interface PromotionProduct {
  id: string;
  name: string;
  images: string[];
  basePrice: number;
  effectivePrice: number;
  hasDiscount: boolean;
  discount: { type: string; value: unknown } | null;
  shop: {
    id: string;
    code: string;
    name: string | null;
    svgId: string | null;
  };
}

export interface UsePromotionsReturn {
  currentPromotion: PromotionProduct | null;
  position: { x: number; y: number } | null;
  isFading: boolean;
  animationKey: number;
  isLoading: boolean;
}

const INITIAL_DELAY = 2000; // 2s after mount before first promotion
const CYCLE_DURATION = 6000; // 6 seconds visible
const FADE_DURATION = 300; // 300ms fade transition
const POSITION_POLL_INTERVAL = 500; // poll for SVG position every 500ms
const POSITION_POLL_MAX = 20; // give up after 10 seconds

// ============================================================================
// Position tracking: find SVG element screen coords
// ============================================================================

function findSvgElementPosition(
  svgId: string
): { x: number; y: number } | null {
  const wrappers = document.querySelectorAll<HTMLElement>(".svgwrapper");
  for (const wrapper of wrappers) {
    const svg = wrapper.querySelector("svg");
    if (!svg) continue;
    let el: Element | null = null;
    try {
      el = svg.querySelector(`[id="${CSS.escape(svgId)}"]`);
    } catch {
      el = svg.querySelector(`[id="${svgId}"]`);
    }
    if (el) {
      const rect = el.getBoundingClientRect();
      // Skip elements with zero size (not rendered / wrong floor)
      if (rect.width === 0 && rect.height === 0) continue;
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
  }
  return null;
}

// ============================================================================
// Hook
// ============================================================================

export function usePromotions(): UsePromotionsReturn {
  const [pool, setPool] = useState<PromotionProduct[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [ready, setReady] = useState(false); // gates initial delay
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null
  );

  const cycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);
  const poolRef = useRef(pool);
  poolRef.current = pool;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  // ------------------------------------------------------------------
  // Initial delay — wait 2s for map to render before fetching
  // ------------------------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), INITIAL_DELAY);
    return () => clearTimeout(timer);
  }, []);

  // ------------------------------------------------------------------
  // Fetch promotions
  // ------------------------------------------------------------------
  const fetchPromotions = useCallback(async () => {
    try {
      const res = await apiClient.get<{ products: PromotionProduct[] }>(
        "/products/promotions",
        { limit: "10" },
        { showErrorToast: false }
      );
      if (!res.success || cancelledRef.current) return;
      const products = res.data.products.filter((p) => p.shop.svgId);
      setPool(products);
      setCurrentIndex(0);
      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  }, []);

  // Fetch once ready
  useEffect(() => {
    if (!ready) return;
    cancelledRef.current = false;
    fetchPromotions();
    return () => {
      cancelledRef.current = true;
    };
  }, [ready, fetchPromotions]);

  // ------------------------------------------------------------------
  // Current promotion
  // ------------------------------------------------------------------
  const currentPromotion =
    pool.length > 0 && currentIndex < pool.length ? pool[currentIndex] : null;

  // ------------------------------------------------------------------
  // Position tracking with polling fallback
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!currentPromotion?.shop.svgId) {
      setPosition(null);
      return;
    }

    const svgId = currentPromotion.shop.svgId;
    let cancelled = false;

    const updatePos = () => {
      if (cancelled) return;
      const pos = findSvgElementPosition(svgId);
      setPosition(pos);
      return pos;
    };

    // Try immediately
    const initialPos = updatePos();

    // If not found, poll until the SVG element appears
    let pollCount = 0;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    if (!initialPos) {
      pollTimer = setInterval(() => {
        pollCount++;
        const pos = updatePos();
        if (pos || pollCount >= POSITION_POLL_MAX) {
          if (pollTimer) clearInterval(pollTimer);
          pollTimer = null;
        }
      }, POSITION_POLL_INTERVAL);
    }

    // Observe map changes for live position updates
    const observers: Array<ResizeObserver | MutationObserver> = [];

    const attachObservers = () => {
      const wrappers = document.querySelectorAll<HTMLElement>(".svgwrapper");
      let mapContainer: Element | null = null;

      for (const wrapper of wrappers) {
        const resizeObs = new ResizeObserver(updatePos);
        resizeObs.observe(wrapper);
        observers.push(resizeObs);

        if (!mapContainer) {
          mapContainer = wrapper.closest(".leaflet-container");
        }

        const leafletPane = wrapper.closest(".leaflet-map-pane");
        if (leafletPane) {
          const paneObs = new MutationObserver(updatePos);
          paneObs.observe(leafletPane, {
            attributes: true,
            attributeFilter: ["style"],
            subtree: true,
          });
          observers.push(paneObs);
        }
      }

      if (mapContainer) {
        mapContainer.addEventListener("mousemove", updatePos, {
          passive: true,
        });
        mapContainer.addEventListener("touchmove", updatePos, {
          passive: true,
        });
      }

      return mapContainer;
    };

    const mapContainer = attachObservers();

    // Watch for new wrappers appearing (e.g., map lazy-loads)
    const bodyObs = new MutationObserver(() => {
      updatePos();
    });
    bodyObs.observe(document.body, { childList: true, subtree: true });
    observers.push(bodyObs);

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      for (const obs of observers) obs.disconnect();
      if (mapContainer) {
        mapContainer.removeEventListener("mousemove", updatePos);
        mapContainer.removeEventListener("touchmove", updatePos);
      }
    };
  }, [currentPromotion]);

  // ------------------------------------------------------------------
  // Cycling logic
  // ------------------------------------------------------------------
  const advanceToNext = useCallback(() => {
    const p = poolRef.current;
    const idx = currentIndexRef.current;

    if (p.length === 0) return;

    const nextIndex = idx + 1;

    if (nextIndex >= p.length) {
      // Pool exhausted — refetch for a new shuffled set
      fetchPromotions();
      return;
    }

    setCurrentIndex(nextIndex);
    setAnimationKey((k) => k + 1);
  }, [fetchPromotions]);

  // Start cycle timer when we have a visible promotion with a position
  useEffect(() => {
    if (!currentPromotion || !position) return;

    // Start the 6-second cycle
    cycleTimerRef.current = setTimeout(() => {
      // Fade out
      setIsFading(true);
      fadeTimerRef.current = setTimeout(() => {
        // Swap product
        advanceToNext();
        // Fade in
        setTimeout(() => setIsFading(false), 50);
      }, FADE_DURATION);
    }, CYCLE_DURATION);

    return () => {
      if (cycleTimerRef.current) clearTimeout(cycleTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [currentPromotion, position, animationKey, advanceToNext]);

  // ------------------------------------------------------------------
  // Cleanup
  // ------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (cycleTimerRef.current) clearTimeout(cycleTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  return {
    currentPromotion,
    position,
    isFading,
    animationKey,
    isLoading,
  };
}
