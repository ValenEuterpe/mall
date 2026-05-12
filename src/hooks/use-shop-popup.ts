"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { MapShop } from "./use-map-data";
import type { ShopPopupData } from "@/components/home/ShopInfoPopup";

export interface UseShopPopupReturn {
  activeShopSvgId: string | null;
  activeShop: ShopPopupData | null;
  handleShopClick: (svgId: string) => void;
  handleCloseShopPopup: () => void;
}

/**
 * Tracks which shop popup (if any) is currently open.
 *
 * Note: position is intentionally NOT tracked here. The popup's screen
 * coordinates change continuously as the user pans/zooms the Leaflet map,
 * so freezing a snapshot at click-time causes the popup to drift away from
 * its shop. Live positioning is handled by `useLiveSvgPosition(svgId)`
 * inside `MapPanel`, which re-measures on every pan/zoom — matching how
 * `ShopPinOverlay` keeps product pin popups glued to their shop.
 */
export function useShopPopup(
  shopsBySvgId: Map<string, MapShop>,
  currentFloor?: string
): UseShopPopupReturn {
  const [activeShopSvgId, setActiveShopSvgId] = useState<string | null>(null);

  const handleShopClick = useCallback((svgId: string) => {
    setActiveShopSvgId(svgId);
  }, []);

  const handleCloseShopPopup = useCallback(() => {
    setActiveShopSvgId(null);
  }, []);

  // Close popup when floor changes
  useEffect(() => {
    handleCloseShopPopup();
  }, [currentFloor, handleCloseShopPopup]);

  const activeShop: ShopPopupData | null = useMemo(() => {
    if (!activeShopSvgId) return null;
    const shop = shopsBySvgId.get(activeShopSvgId);
    if (!shop) return null;
    return {
      id: shop.id,
      fullCode: shop.fullCode,
      shopName: shop.shopName,
      description: shop.description,
      imageUrl: shop.imageUrl,
      openingHours: shop.openingHours || null,
      contacts: shop.contacts || [],
      shopType: shop.shopType || null,
      seller: shop.seller
        ? {
            businessName: shop.seller.businessName,
            logoUrl: shop.seller.logoUrl,
            phone: shop.seller.phone || null,
            socialLinks: shop.seller.socialLinks || null,
          }
        : null,
    };
  }, [activeShopSvgId, shopsBySvgId]);

  return {
    activeShopSvgId,
    activeShop,
    handleShopClick,
    handleCloseShopPopup,
  };
}
