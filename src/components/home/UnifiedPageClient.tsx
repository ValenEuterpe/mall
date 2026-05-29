"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/routing";
import { useIsMobile } from "@/hooks/use-media-query";
import { MobilePanelSheet } from "@/components/layout/MobilePanelSheet";
import { SIDEBAR_PANELS } from "@/contexts/sidebar-toggle-context";
import {
  useProductSearch,
  type ProductSearchItem,
} from "@/hooks/use-product-search";
import { useMultiMapData } from "@/hooks/use-multi-map-data";
import type { BuildingOverlay } from "./LeafletMapView";
import { useShopPopup } from "@/hooks/use-shop-popup";
import { useMapPins } from "@/hooks/use-map-pins";
import { useSidebarToggle } from "@/contexts/sidebar-toggle-context";
import { useOptionalFavorites } from "@/hooks/use-optional-favorites";

import { ProductFilterPanel } from "@/components/shared/ProductFilterPanel";
import { ProductDetailModal } from "@/components/products/ProductDetailModal";

import { MapPanel } from "./MapPanel";
import { HomeLandingContent } from "./HomeLandingContent";
import { SearchResultsContent } from "./SearchResultsContent";

export function UnifiedPageClient(): React.ReactElement {
  const t = useTranslations("home");
  const isMobile = useIsMobile();
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL-driven search state
  const urlQuery = searchParams.get("q") ?? "";
  const isSearchActive = urlQuery.trim().length > 0;

  // Sidebar toggle context — viewport-aware: mobile flips MobilePanel, desktop flips localStorage
  const { filterOpen, mapOpen } = useSidebarToggle();

  // Product search
  const {
    products,
    totalProducts,
    productsLoading,
    hasMore,
    page,
    // `searchQuery` value is read elsewhere via URL; only the setter is used here.
    searchQuery: _searchQuery,
    setSearchQuery,
    categories,
    selectedCategory,
    setSelectedCategory,
    availableTags,
    selectedTagIds,
    setSelectedTagIds,
    priceRange,
    setPriceRange,
    maxPrice,
    activeFiltersCount,
    handleLoadMore,
    handleResetFilters,
  } = useProductSearch({ initialQuery: urlQuery });

  // Sync URL query changes to the hook
  useEffect(() => {
    setSearchQuery(urlQuery);
  }, [urlQuery, setSearchQuery]);

  // Map data (multi-building)
  const {
    buildings: mapBuildings,
    globalCenter,
    globalLoading,
    globalError,
    setFloorForBuilding,
    allShopsBySvgId,
    allShopSvgIds,
  } = useMultiMapData();

  // Build building overlays for LeafletMapView
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

  // Shop popup
  const {
    activeShopSvgId,
    activeShop,
    handleShopClick,
    handleCloseShopPopup,
  } = useShopPopup(allShopsBySvgId);

  // Map pins
  const {
    productPins,
    selectedCount,
    handleAddToMap: mapPinsAddToMap,
    handleRemoveFromMap,
    isSelected,
  } = useMapPins();

  const { isFavorite, toggleFavorite } = useOptionalFavorites();

  // Product detail modal
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );

  const handleAddToMap = useCallback(
    (product: ProductSearchItem) => {
      // Auto-switch floor if the product's shop is on a different floor
      const code = product.shop.code ?? "";
      const floorMatch = code.match(/F(\d+)/i);
      const buildingMatch = code.match(/B(\d+)/i);
      if (floorMatch && buildingMatch) {
        const shopFloor = floorMatch[1];
        const buildingCode = `B${buildingMatch[1]}`;
        const building = mapBuildings.find(
          (b) => b.buildingCode === buildingCode
        );
        if (building && building.currentFloor !== shopFloor) {
          setFloorForBuilding(buildingCode, shopFloor);
        }
      }
      mapPinsAddToMap({ id: product.id, shop: { svgId: product.shop.svgId } });
    },
    [mapPinsAddToMap, mapBuildings, setFloorForBuilding]
  );

  const handleViewProduct = useCallback((productId: string) => {
    setSelectedProductId(productId);
  }, []);

  const handleCloseProductDetail = useCallback(() => {
    setSelectedProductId(null);
  }, []);

  const handleRemoveSelectedFromMap = useCallback(() => {
    if (selectedProductId) {
      handleRemoveFromMap(selectedProductId);
    }
  }, [selectedProductId, handleRemoveFromMap]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  const handleCategoryClick = useCallback(
    (categoryId: string) => {
      setSelectedCategory(categoryId);
      router.push("/?q= ");
    },
    [setSelectedCategory, router]
  );

  const handleClearCategory = useCallback(() => {
    setSelectedCategory("all");
  }, [setSelectedCategory]);

  // Shared map panel props
  const mapPanelProps = {
    mapCenter: globalCenter,
    mapLoading: globalLoading,
    mapError: globalError,
    selectedCount,
    shopSvgIds: allShopSvgIds,
    activeShopSvgId: activeShopSvgId ?? null,
    onShopClick: handleShopClick,
    productPins,
    shopsBySvgId: allShopsBySvgId,
    onRemoveProduct: handleRemoveFromMap,
    onViewProduct: handleViewProduct,
    activeShop,
    onCloseShopPopup: handleCloseShopPopup,
    buildings: buildingOverlays,
  };

  // ===========================================================================
  // Mobile Layout
  // ===========================================================================
  if (isMobile) {
    return (
      <div className="relative w-full overflow-x-hidden">
        {/* Main content */}
        {isSearchActive ? (
          <SearchResultsContent
            products={products}
            totalProducts={totalProducts}
            productsLoading={productsLoading}
            hasMore={hasMore}
            page={page}
            onLoadMore={handleLoadMore}
            onResetFilters={handleResetFilters}
            onViewProduct={handleViewProduct}
            onAddToMap={handleAddToMap}
            onRemoveFromMap={handleRemoveFromMap}
            isSelected={isSelected}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        ) : (
          <HomeLandingContent
            categories={categories}
            selectedCategory={selectedCategory}
            products={products}
            productsLoading={productsLoading}
            onCategoryClick={handleCategoryClick}
            onClearCategory={handleClearCategory}
            onViewProduct={handleViewProduct}
            onAddToMap={handleAddToMap}
            onRemoveFromMap={handleRemoveFromMap}
            isSelected={isSelected}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        )}

        {/* Mobile Filter Panel — opened via header SlidersHorizontal button */}
        <MobilePanelSheet name={SIDEBAR_PANELS.filter} title={t("filters.title")}>
          <div className="h-full space-y-4 overflow-y-auto p-4">
            <ProductFilterPanel
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              availableTags={availableTags}
              selectedTagIds={selectedTagIds}
              onTagChange={setSelectedTagIds}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              maxPrice={maxPrice}
              activeFiltersCount={activeFiltersCount}
              onReset={handleResetFilters}
            />
          </div>
        </MobilePanelSheet>

        {/* Mobile Map Panel — opened via header Map button */}
        <MobilePanelSheet name={SIDEBAR_PANELS.map} title={t("map.title")}>
          <div className="h-full p-3">
            <div className="border-accent h-full rounded-lg border-4 shadow-lg">
              <MapPanel {...mapPanelProps} />
            </div>
          </div>
        </MobilePanelSheet>

        {/* Product Detail Modal */}
        <ProductDetailModal
          productId={selectedProductId}
          onClose={handleCloseProductDetail}
          onAddToMap={selectedProduct ? () => handleAddToMap(selectedProduct) : undefined}
          onRemoveFromMap={handleRemoveSelectedFromMap}
          isOnMap={selectedProductId ? isSelected(selectedProductId) : false}
          context="user"
        />
      </div>
    );
  }

  // ===========================================================================
  // Desktop: Landing Mode (no search query)
  // ===========================================================================
  // Layout pattern (Airbnb/Zillow-style split-pane):
  // - Document scrolls naturally → one scrollbar, footer reachable.
  // - Map column is sticky to the viewport so it stays in place while the
  //   user scrolls the listings; height is pinned to viewport minus header.
  // - When map is closed, the right column is removed and content reflows
  //   to full width — no phantom whitespace.
  if (!isSearchActive) {
    return (
      <div className="flex w-full">
        <div className="min-w-0 flex-1">
          <HomeLandingContent
            categories={categories}
            selectedCategory={selectedCategory}
            products={products}
            productsLoading={productsLoading}
            onCategoryClick={handleCategoryClick}
            onClearCategory={handleClearCategory}
            onViewProduct={handleViewProduct}
            onAddToMap={handleAddToMap}
            onRemoveFromMap={handleRemoveFromMap}
            isSelected={isSelected}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        </div>

        {mapOpen && (
          <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-1/3 shrink-0 self-start p-3 md:block">
            <div className="border-accent h-full rounded-lg border-4 shadow-lg">
              <MapPanel {...mapPanelProps} />
            </div>
          </aside>
        )}

        <ProductDetailModal
          productId={selectedProductId}
          onClose={handleCloseProductDetail}
          onAddToMap={selectedProduct ? () => handleAddToMap(selectedProduct) : undefined}
          onRemoveFromMap={handleRemoveSelectedFromMap}
          isOnMap={selectedProductId ? isSelected(selectedProductId) : false}
          context="user"
        />
      </div>
    );
  }

  // ===========================================================================
  // Desktop: Search Mode (active query)
  // ===========================================================================
  return (
    <div className="flex w-full">
      {/* Filter Sidebar */}
      {filterOpen && (
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 self-start p-3 md:block">
          <div className="border-accent bg-background h-full overflow-y-auto rounded-lg border-4 p-4 shadow-lg">
            <ProductFilterPanel
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              availableTags={availableTags}
              selectedTagIds={selectedTagIds}
              onTagChange={setSelectedTagIds}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              maxPrice={maxPrice}
              activeFiltersCount={activeFiltersCount}
              onReset={handleResetFilters}
            />
          </div>
        </aside>
      )}

      {/* Search Results */}
      <div className="min-w-0 flex-1">
        <SearchResultsContent
          products={products}
          totalProducts={totalProducts}
          productsLoading={productsLoading}
          hasMore={hasMore}
          page={page}
          onLoadMore={handleLoadMore}
          onResetFilters={handleResetFilters}
          onViewProduct={handleViewProduct}
          onAddToMap={handleAddToMap}
          onRemoveFromMap={handleRemoveFromMap}
          isSelected={isSelected}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
        />
      </div>

      {/* Map Sidebar */}
      {mapOpen && (
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-80 shrink-0 self-start p-3 md:block">
          <div className="border-accent h-full rounded-lg border-4 shadow-lg">
            <MapPanel {...mapPanelProps} />
          </div>
        </aside>
      )}

      <ProductDetailModal
        productId={selectedProductId}
        onClose={handleCloseProductDetail}
        onAddToMap={selectedProduct ? () => handleAddToMap(selectedProduct) : undefined}
        onRemoveFromMap={handleRemoveSelectedFromMap}
        isOnMap={selectedProductId ? isSelected(selectedProductId) : false}
        context="user"
      />
    </div>
  );
}

export default UnifiedPageClient;
