"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/utils/toast";
import { useMapSelection } from "@/hooks/use-map-selection";

// ============================================================================
// Types
// ============================================================================

export interface ProductPinData {
  productId: string;
  svgId: string;
  thumbnail: string;
  name: string;
  price?: number;
  effectivePrice?: number;
  hasDiscount?: boolean;
  discount?: { type: string; value: number } | null;
  shopName?: string;
}

interface BatchProduct {
  id: string;
  name: string;
  basePrice?: number;
  effectivePrice?: number;
  hasDiscount?: boolean;
  discount?: { type: string; value: number } | null;
  images: string[];
  shop: {
    svgId: string | null;
    shopName: string | null;
  };
}

export interface UseMapPinsReturn {
  /** Resolved pin data for products currently in the map selection */
  productPins: ProductPinData[];
  /** Number of selected products */
  selectedCount: number;
  /** Product IDs in the selection */
  productIds: string[];
  /** Toggle a product on/off the map (with toast + svgId validation) */
  handleAddToMap: (product: {
    id: string;
    shop: { svgId?: string | null };
  }) => void;
  /** Remove a product from the map (with toast) */
  handleRemoveFromMap: (productId: string) => void;
  /** Check if a product is currently selected */
  isSelected: (productId: string) => boolean;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Shared hook for resolving map selection product IDs into pin data.
 * Used by both HomeMapExplorer and ExplorePageClient so that add-to-map
 * works identically on both pages with a single source of truth.
 */
export function useMapPins(): UseMapPinsReturn {
  const tProducts = useTranslations("products");
  const { productIds, toggleProduct, removeProduct, isSelected } =
    useMapSelection();

  const [productPins, setProductPins] = useState<ProductPinData[]>([]);

  // Resolve product IDs → pin data via batch API
  useEffect(() => {
    let cancelled = false;

    async function resolvePins(): Promise<void> {
      if (productIds.length === 0) {
        setProductPins([]);
        return;
      }

      try {
        const res = await apiClient.post<{ products: BatchProduct[] }>(
          "/products/batch",
          { ids: productIds }
        );

        if (!res.success || cancelled) return;

        const pins: ProductPinData[] = [];
        for (const p of res.data.products) {
          if (p.shop.svgId) {
            pins.push({
              productId: p.id,
              svgId: p.shop.svgId,
              thumbnail: p.images[0] || "",
              name: p.name,
              price: p.basePrice,
              effectivePrice: p.effectivePrice,
              hasDiscount: p.hasDiscount,
              discount: p.discount,
              shopName: p.shop.shopName || undefined,
            });
          }
        }
        setProductPins(pins);
      } catch {
        // Silent fail — pins just won't update
      }
    }

    resolvePins();

    return () => {
      cancelled = true;
    };
  }, [productIds]);

  const handleAddToMap = useCallback(
    (product: { id: string; shop: { svgId?: string | null } }) => {
      if (!product.shop.svgId) {
        toast.error(tProducts("noShopLocation"));
        return;
      }

      toggleProduct(product.id);

      if (!isSelected(product.id)) {
        toast.success(tProducts("addedToMap"));
      }
    },
    [toggleProduct, isSelected, tProducts]
  );

  const handleRemoveFromMap = useCallback(
    (productId: string) => {
      removeProduct(productId);
      toast.success(tProducts("removedFromMap"));
    },
    [removeProduct, tProducts]
  );

  return useMemo(
    () => ({
      productPins,
      selectedCount: productIds.length,
      productIds,
      handleAddToMap,
      handleRemoveFromMap,
      isSelected,
    }),
    [
      productPins,
      productIds,
      handleAddToMap,
      handleRemoveFromMap,
      isSelected,
    ]
  );
}
