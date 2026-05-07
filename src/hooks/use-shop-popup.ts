"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { MapShop } from "./use-map-data";
import type { ShopPopupData } from "@/components/home/ShopInfoPopup";

export interface UseShopPopupReturn {
  activeShopSvgId: string | null;
  shopPopupPos: { x: number; y: number } | null;
  activeShop: ShopPopupData | null;
  handleShopClick: (svgId: string) => void;
  handleCloseShopPopup: () => void;
}

export function useShopPopup(
  shopsBySvgId: Map<string, MapShop>,
  currentFloor?: string
): UseShopPopupReturn {
  const [activeShopSvgId, setActiveShopSvgId] = useState<string | null>(null);
  const [shopPopupPos, setShopPopupPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handleShopClick = useCallback((svgId: string) => {
    // Search across all building wrappers (multi-building support)
    const el =
      document.querySelector(`.svgwrapper svg [id="${CSS.escape(svgId)}"]`) ||
      document.querySelector(`.svgwrapper [id="${CSS.escape(svgId)}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      setShopPopupPos({ x: rect.left + rect.width / 2, y: rect.top });
    }
    setActiveShopSvgId(svgId);
  }, []);

  const handleCloseShopPopup = useCallback(() => {
    setActiveShopSvgId(null);
    setShopPopupPos(null);
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
    shopPopupPos,
    activeShop,
    handleShopClick,
    handleCloseShopPopup,
  };
}
