"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { toast } from "@/lib/utils/toast";

import { EmptyCart } from "./EmptyCart";
import { CartShopGroup } from "./CartShopGroup";
import { CartSummary } from "./CartSummary";

import { useIsMobile } from "@/hooks/use-media-query";
import { useMultiMapData } from "@/hooks/use-multi-map-data";
import { useShopPopup } from "@/hooks/use-shop-popup";
import {
  useSidebarToggle,
  SIDEBAR_PANELS,
} from "@/contexts/sidebar-toggle-context";
import { MobilePanelSheet } from "@/components/layout/MobilePanelSheet";
import { MapPanel } from "@/components/home/MapPanel";
import type { BuildingOverlay } from "@/components/home/LeafletMapView";
import type { ProductPinData } from "@/hooks/use-map-pins";
import { useRouter } from "@/i18n/routing";

function CartSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function CartPageClient(): React.ReactElement {
  const t = useTranslations("cart");
  const tHome = useTranslations("home");
  const locale = useLocale();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { isAuthenticated } = useAuth();
  const {
    items,
    isHydrated,
    itemCount,
    totalQuantity,
    totalPrice,
    getItemsByShop,
    incrementQuantity,
    decrementQuantity,
    removeItem,
    clearCart,
  } = useCart();

  const { mapOpen } = useSidebarToggle();

  const {
    buildings: mapBuildings,
    globalCenter,
    globalLoading,
    globalError,
    setFloorForBuilding,
    allShopsBySvgId,
    allShopSvgIds,
  } = useMultiMapData();

  const { activeShopSvgId, activeShop, handleShopClick, handleCloseShopPopup } =
    useShopPopup(allShopsBySvgId);

  const handleRemove = useCallback(
    (productId: string) => {
      removeItem(productId);
      toast.success(t("itemRemoved"));
    },
    [removeItem, t]
  );

  const handleClearCart = useCallback(() => {
    clearCart();
    toast.success(t("cleared"));
  }, [clearCart, t]);

  const shopGroups = useMemo(() => {
    const map = getItemsByShop();
    return Array.from(map.entries()).map(([shopId, shopItems]) => {
      const first = shopItems[0];
      return {
        shopId,
        shopName: first?.shopName || shopId,
        shopCode: first?.shopCode,
        items: shopItems,
      };
    });
  }, [getItemsByShop]);

  const buildingOverlays: BuildingOverlay[] = useMemo(
    () =>
      mapBuildings.map((b) => ({
        buildingCode: b.buildingCode,
        svgContent: b.svgMarkup,
        center: b.center,
        rotation: b.rotation,
        scale: b.scale,
        floors: b.floors,
        currentFloor: b.currentFloor,
        onFloorChange: (floor: string) =>
          setFloorForBuilding(b.buildingCode, floor),
      })),
    [mapBuildings, setFloorForBuilding]
  );

  const cartPins: ProductPinData[] = useMemo(() => {
    return items
      .filter((item) => item.shopLocation?.svgId)
      .map((item) => ({
        productId: item.id,
        svgId: item.shopLocation!.svgId!,
        thumbnail: item.images[0] || "",
        name: item.name,
        price: item.price,
        shopName: item.shopName,
      }));
  }, [items]);

  useEffect(() => {
    if (mapBuildings.length === 0) return;
    const firstItem = items.find((item) => item.shopLocation?.svgId);
    if (!firstItem) return;
    const code = firstItem.shopCode ?? "";
    const floorMatch = code.match(/F(\d+)/i);
    const buildingMatch = code.match(/B(\d+)/i);
    if (floorMatch && buildingMatch) {
      const buildingCode = `B${buildingMatch[1]}`;
      const building = mapBuildings.find(
        (b) => b.buildingCode === buildingCode
      );
      if (building && building.currentFloor !== floorMatch[1]) {
        setFloorForBuilding(buildingCode, floorMatch[1]);
      }
    }
  }, [mapBuildings.length]);

  const handleViewProduct = useCallback(
    (productId: string) => {
      router.push(`/products/${productId}`);
    },
    [router]
  );

  const mapPanelProps = {
    mapCenter: globalCenter,
    mapLoading: globalLoading,
    mapError: globalError,
    selectedCount: cartPins.length,
    shopSvgIds: allShopSvgIds,
    activeShopSvgId: activeShopSvgId ?? null,
    onShopClick: handleShopClick,
    productPins: cartPins,
    shopsBySvgId: allShopsBySvgId,
    onRemoveProduct: () => {},
    onViewProduct: handleViewProduct,
    activeShop,
    onCloseShopPopup: handleCloseShopPopup,
    buildings: buildingOverlays,
  };

  if (!isHydrated) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <CartSkeleton />
      </div>
    );
  }

  if (itemCount === 0) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <EmptyCart isAuthenticated={isAuthenticated} />
      </div>
    );
  }

  const cartContent = (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("subtitle", { count: totalQuantity })}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearCart}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t("clearCart")}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {shopGroups.map((group) => (
            <CartShopGroup
              key={group.shopId}
              shopId={group.shopId}
              shopName={group.shopName}
              shopCode={group.shopCode}
              items={group.items}
              locale={locale}
              onIncrement={incrementQuantity}
              onDecrement={decrementQuantity}
              onRemove={handleRemove}
            />
          ))}
        </div>

        <div className="lg:sticky lg:top-24">
          <CartSummary
            totalPrice={totalPrice}
            itemCount={itemCount}
            totalQuantity={totalQuantity}
            locale={locale}
          />
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="relative w-full overflow-x-hidden">
        {cartContent}

        <MobilePanelSheet name={SIDEBAR_PANELS.map} title={tHome("map.title")}>
          <div className="h-full p-3">
            <div className="border-accent h-full rounded-lg border-4 shadow-lg">
              <MapPanel {...mapPanelProps} />
            </div>
          </div>
        </MobilePanelSheet>
      </div>
    );
  }

  return (
    <div className="flex w-full">
      <div className="min-w-0 flex-1">{cartContent}</div>

      {mapOpen && (
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-1/3 shrink-0 self-start p-3 md:block">
          <div className="border-accent h-full rounded-lg border-4 shadow-lg">
            <MapPanel {...mapPanelProps} />
          </div>
        </aside>
      )}
    </div>
  );
}
