"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import type { ProductPinData } from "@/hooks/use-map-pins";
import type { MapShop } from "@/hooks/use-map-data";
import type { ShopPopupData } from "@/components/home/ShopInfoPopup";
import type { BuildingOverlay } from "./LeafletMapView";
import { ShopPinOverlay } from "./ShopPinOverlay";
import { ShopInfoPopup } from "./ShopInfoPopup";
import { usePromotions } from "@/hooks/use-promotions";
import { PromotionOverlay } from "./PromotionOverlay";

const LeafletMapView = dynamic(
  () => import("@/components/home/LeafletMapView"),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/30 flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    ),
  }
);

export interface MapPanelProps {
  svgMarkup?: string | null;
  mapCenter: [number, number];
  mapRotation?: number;
  mapScale?: number;
  mapLoading: boolean;
  mapError: string | null;
  selectedCount: number;
  shopSvgIds: Set<string>;
  activeShopSvgId: string | null;
  onShopClick: (svgId: string) => void;
  productPins: ProductPinData[];
  shopsBySvgId: Map<string, MapShop>;
  onRemoveProduct: (productId: string) => void;
  onViewProduct: (productId: string) => void;
  floors?: { floor: string; label?: string }[];
  currentFloor?: string;
  onFloorChange?: (floor: string) => void;
  activeShop: ShopPopupData | null;
  shopPopupPos: { x: number; y: number } | null;
  onCloseShopPopup: () => void;
  /** Multi-building mode */
  buildings?: BuildingOverlay[];
}

export function MapPanel({
  svgMarkup,
  mapCenter,
  mapRotation,
  mapScale,
  mapLoading,
  mapError,
  selectedCount,
  shopSvgIds,
  activeShopSvgId,
  onShopClick,
  productPins,
  shopsBySvgId,
  onRemoveProduct,
  onViewProduct,
  floors,
  currentFloor,
  onFloorChange,
  activeShop,
  shopPopupPos,
  onCloseShopPopup,
  buildings,
}: MapPanelProps): React.ReactElement {
  const { currentPromotion, position, isFading, animationKey } =
    usePromotions();

  return (
    <div className="relative h-full w-full">
      <LeafletMapView
        svgContent={svgMarkup}
        center={mapCenter}
        rotation={mapRotation}
        scale={mapScale}
        loading={mapLoading}
        error={mapError}
        selectedCount={selectedCount}
        shopSvgIds={shopSvgIds}
        activeShopSvgId={activeShopSvgId}
        onShopClick={onShopClick}
        floors={floors}
        currentFloor={currentFloor}
        onFloorChange={onFloorChange}
        buildings={buildings}
      />

      <PromotionOverlay
        promotion={currentPromotion}
        position={position}
        isFading={isFading}
        animationKey={animationKey}
        onViewProduct={onViewProduct}
      />

      <ShopPinOverlay
        productPins={productPins}
        shopsBySvgId={shopsBySvgId}
        onRemoveProduct={onRemoveProduct}
        onViewProduct={onViewProduct}
      />

      {activeShop && shopPopupPos && (
        <ShopInfoPopup
          shop={activeShop}
          position={shopPopupPos}
          onClose={onCloseShopPopup}
        />
      )}
    </div>
  );
}
