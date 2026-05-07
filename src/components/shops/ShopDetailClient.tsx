"use client";

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, MapPin } from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { formatShopLocation } from "@/lib/utils/format-shop-location";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useRouter } from "@/i18n/routing";
import { useIsMobile } from "@/hooks/use-media-query";
import { useMultiMapData } from "@/hooks/use-multi-map-data";
import type { BuildingOverlay } from "@/components/home/LeafletMapView";
import { useShopPopup } from "@/hooks/use-shop-popup";
import { useMapPins } from "@/hooks/use-map-pins";
import { useSidebarToggle } from "@/contexts/sidebar-toggle-context";
import {
  UserProductCard,
  UserProductCardSkeleton,
} from "@/components/products/UserProductCard";
import { ProductDetailModal } from "@/components/products/ProductDetailModal";
import { ProductFilterPanel } from "@/components/shared/ProductFilterPanel";
import { MapPanel } from "@/components/home/MapPanel";
import type { ProductCardData, ProductCardShop } from "@/types/product";
import type { ProductCategory } from "@/hooks/use-product-search";

// ============================================================================
// Types
// ============================================================================

type ShopContact = {
  id: string;
  type: string;
  value: string;
  label: string | null;
};

const SOCIAL_ICON_MAP: Record<string, { icon: string; label: string }> = {
  TELEGRAM: { icon: "/icons/social/Telegram.svg", label: "Telegram" },
  INSTAGRAM: { icon: "/icons/social/Instagram.svg", label: "Instagram" },
  FACEBOOK: { icon: "/icons/social/Facebook.svg", label: "Facebook" },
  VK: { icon: "/icons/social/VK.svg", label: "VK" },
  WHATSAPP: { icon: "/icons/social/WhatsApp.svg", label: "WhatsApp" },
  X_TWITTER: { icon: "/icons/social/X_Twitter.svg", label: "X / Twitter" },
  TIKTOK: { icon: "/icons/social/TikTok.svg", label: "TikTok" },
  YOUTUBE: { icon: "/icons/social/YouTube.svg", label: "YouTube" },
  SNAPCHAT: { icon: "/icons/social/Snapchat.svg", label: "Snapchat" },
};

type ShopTypeInfo = {
  id: string;
  key: string;
  name_en: string;
  name_ru: string;
  name_am: string | null;
  icon: string | null;
  color: string | null;
};

type ShopDetail = {
  id: string;
  venue: string;
  building: string | null;
  floor: string | null;
  shopNumber: string;
  fullCode: string;
  shopName: string | null;
  description: string | null;
  imageUrl: string | null;
  svgId: string | null;
  openingHours: unknown;
  shopType: ShopTypeInfo | null;
  contacts: ShopContact[];
  seller: null | {
    id: string;
    businessName: string | null;
    phone: string | null;
    description: string | null;
    logoUrl: string | null;
    socialLinks: unknown;
    isVerified: boolean;
  };
};

type ProductItem = {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  effectivePrice?: number;
  hasDiscount?: boolean;
  discount?: { type: string; value: number } | null;
  stockQuantity: number;
  images: string[];
  brand: string | null;
  categoryId: string | null;
  category: {
    id: string;
    name_en: string;
    name_ru: string;
    name_am: string | null;
  } | null;
};

type ShopDetailResponse = {
  shop: ShopDetail;
  products: ProductItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

// ============================================================================
// Helpers
// ============================================================================

function toProductCardData(p: ProductItem, shop: ShopDetail): ProductCardData {
  const cardShop: ProductCardShop = {
    id: shop.id,
    fullCode: shop.fullCode,
    shopName: shop.shopName,
    svgId: shop.svgId,
    venue: shop.venue,
    building: shop.building,
    floor: shop.floor,
  };

  return {
    id: p.id,
    name: p.name,
    description: p.description,
    basePrice: p.basePrice,
    effectivePrice: p.effectivePrice,
    hasDiscount: p.hasDiscount,
    discount: p.discount,
    stockQuantity: p.stockQuantity,
    images: p.images,
    brand: p.brand,
    shop: cardShop,
  };
}

// ============================================================================
// Component
// ============================================================================

export const ShopDetailClient = memo(function ShopDetailClient({
  code,
}: {
  code: string;
}) {
  const t = useTranslations("shop");
  const tc = useTranslations("common");
  const router = useRouter();
  const locale = useLocale();
  const isMobile = useIsMobile();

  // ---- Shop data ----
  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // ---- Map integration (multi-building, same as home page) ----
  const floorFromCode = useMemo(() => {
    const match = code.match(/F(\d+)/i);
    return match ? match[1] : "1";
  }, [code]);

  const buildingFromCode = useMemo(() => {
    const match = code.match(/B(\d+)/i);
    return match ? `B${match[1]}` : undefined;
  }, [code]);

  const {
    buildings: mapBuildings,
    globalCenter,
    globalLoading,
    globalError,
    setFloorForBuilding,
    allShopsBySvgId,
    allShopSvgIds,
  } = useMultiMapData();

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

  const {
    activeShopSvgId,
    shopPopupPos,
    activeShop,
    handleShopClick,
    handleCloseShopPopup,
  } = useShopPopup(allShopsBySvgId);

  const {
    productPins,
    selectedCount,
    handleAddToMap: mapPinsAddToMap,
    handleRemoveFromMap,
    isSelected,
  } = useMapPins();

  const { filterOpen, mapOpen } = useSidebarToggle();

  // ---- Filter state ----
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const [maxPriceInitialized, setMaxPriceInitialized] = useState(false);

  const maxPrice = useMemo(() => {
    if (products.length === 0) return 100000;
    return Math.ceil(
      Math.max(...products.map((p) => Number(p.effectivePrice ?? p.basePrice)))
    );
  }, [products]);

  useEffect(() => {
    if (!maxPriceInitialized && products.length > 0) {
      setPriceRange([0, maxPrice]);
      setMaxPriceInitialized(true);
    }
  }, [maxPrice, maxPriceInitialized, products.length]);

  const categories: ProductCategory[] = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const p of products) {
      if (p.categoryId && p.category) {
        const existing = map.get(p.categoryId);
        if (existing) {
          existing.count++;
        } else {
          const name =
            locale === "ru"
              ? p.category.name_ru
              : locale === "am"
                ? (p.category.name_am ?? p.category.name_en)
                : p.category.name_en;
          map.set(p.categoryId, { name, count: 1 });
        }
      }
    }
    return Array.from(map.entries()).map(([id, { name, count }]) => ({
      id,
      name,
      productCount: count,
    }));
  }, [products, locale]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== "all" && p.categoryId !== selectedCategory) {
        return false;
      }
      const price = Number(p.effectivePrice ?? p.basePrice);
      if (price < priceRange[0] || price > priceRange[1]) {
        return false;
      }
      return true;
    });
  }, [products, selectedCategory, priceRange]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== "all") count++;
    if (priceRange[0] > 0 || priceRange[1] < maxPrice) count++;
    return count;
  }, [selectedCategory, priceRange, maxPrice]);

  const handleResetFilters = useCallback(() => {
    setSelectedCategory("all");
    setPriceRange([0, maxPrice]);
  }, [maxPrice]);

  // ---- Product detail modal ----
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
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

  const handleShowOnMap = useCallback(() => {
    if (!shop?.svgId) return;
    if (buildingFromCode) {
      const building = mapBuildings.find(
        (b) => b.buildingCode === buildingFromCode
      );
      if (building && building.currentFloor !== floorFromCode) {
        setFloorForBuilding(buildingFromCode, floorFromCode);
      }
    }
    setTimeout(() => handleShopClick(shop.svgId!), 100);
  }, [shop?.svgId, buildingFromCode, floorFromCode, mapBuildings, setFloorForBuilding, handleShopClick]);

  // ---- Derived ----
  const title =
    shop?.shopName || shop?.seller?.businessName || shop?.fullCode || code;

  const humanLocation = useMemo(() => {
    if (!shop) return null;
    return formatShopLocation(shop.fullCode, tc);
  }, [shop, tc]);

  const rawLocation = useMemo(() => {
    if (!shop) return null;
    return [shop.venue, shop.building, shop.floor, shop.shopNumber]
      .filter(Boolean)
      .join(" \u2022 ");
  }, [shop]);

  // ---- Load shop data ----
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        const res = await apiClient.get<ShopDetailResponse>(
          `/public/shops/${code}`,
          { page: 1, limit: 20 }
        );
        if (!res.success) throw new Error(res.error.message);
        if (cancelled) return;
        setShop(res.data.shop);
        setProducts(res.data.products);
        setPage(res.data.meta.page);
        setHasMore(res.data.meta.hasMore);
      } catch {
        if (!cancelled) {
          setShop(null);
          setProducts([]);
          setHasMore(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [code]);

  // ---- Auto-switch building/floor & highlight shop on map (once on load) ----
  const initialMapSyncDone = useRef(false);
  useEffect(() => {
    if (initialMapSyncDone.current) return;
    if (!shop?.svgId || globalLoading || mapBuildings.length === 0) return;

    initialMapSyncDone.current = true;

    if (buildingFromCode) {
      const building = mapBuildings.find(
        (b) => b.buildingCode === buildingFromCode
      );
      if (building && building.currentFloor !== floorFromCode) {
        setFloorForBuilding(buildingFromCode, floorFromCode);
      }
    }

    const timer = setTimeout(() => handleShopClick(shop.svgId!), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.svgId, globalLoading, mapBuildings.length]);

  // ---- Infinite scroll for products ----
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setLoadingMore(true);
          const nextPage = page + 1;

          apiClient
            .get<ShopDetailResponse>(`/public/shops/${code}`, {
              page: nextPage,
              limit: 20,
            })
            .then((res) => {
              if (!res.success) throw new Error(res.error.message);
              setProducts((prev) => [...prev, ...res.data.products]);
              setPage(res.data.meta.page);
              setHasMore(res.data.meta.hasMore);
            })
            .catch(() => setHasMore(false))
            .finally(() => setLoadingMore(false));
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [code, hasMore, loading, loadingMore, page]);

  // ---- Map panel props ----
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
    shopPopupPos,
    onCloseShopPopup: handleCloseShopPopup,
    buildings: buildingOverlays,
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="text-muted-foreground rounded-md border p-4 text-sm">
        {t("notFound")}
      </div>
    );
  }

  // ===========================================================================
  // Shop Info + Products (scrollable content)
  // ===========================================================================
  const shopContent = (
    <div className="space-y-6 p-4 sm:p-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="gap-1"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("back")}
      </Button>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="bg-muted h-40 w-full overflow-hidden rounded-md md:h-40 md:w-72">
              {(shop.imageUrl || shop.seller?.logoUrl) && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={shop.imageUrl ?? shop.seller?.logoUrl ?? ""}
                  alt={title}
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-xl font-semibold">{title}</h2>
                {shop.svgId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShowOnMap}
                    className="shrink-0"
                  >
                    <MapPin className="mr-1.5 h-4 w-4" />
                    {t("viewOnMap")}
                  </Button>
                )}
              </div>
              {shop.shopType && (
                <div className="flex items-center gap-2">
                  {shop.shopType.icon && (
                    <img
                      src={shop.shopType.icon}
                      alt=""
                      className="h-5 w-5 rounded object-cover"
                    />
                  )}
                  <span
                    className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
                    style={
                      shop.shopType.color
                        ? {
                            borderColor: shop.shopType.color,
                            color: shop.shopType.color,
                          }
                        : undefined
                    }
                  >
                    {locale === "ru" && shop.shopType.name_ru
                      ? shop.shopType.name_ru
                      : locale === "am" && shop.shopType.name_am
                        ? shop.shopType.name_am
                        : shop.shopType.name_en}
                  </span>
                </div>
              )}
              {humanLocation && (
                <div className="text-muted-foreground text-sm">
                  {humanLocation}
                  {rawLocation && (
                    <span className="ml-1 text-xs">({rawLocation})</span>
                  )}
                </div>
              )}
              {(shop.description || shop.seller?.description) && (
                <p className="text-sm">
                  {shop.description || shop.seller?.description}
                </p>
              )}
            </div>
          </div>

          {shop.contacts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">{t("contacts")}</h3>
              <div className="flex flex-wrap gap-3">
                {shop.contacts.map((c) => {
                  const social = SOCIAL_ICON_MAP[c.type];
                  const isLink = c.value.startsWith("http");
                  const content = (
                    <span className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                      {social ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={social.icon}
                          alt={social.label}
                          className="h-4 w-4"
                        />
                      ) : null}
                      <span>{c.label || social?.label || c.type}</span>
                    </span>
                  );
                  return isLink ? (
                    <a
                      key={c.id}
                      href={c.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:opacity-80"
                    >
                      {content}
                    </a>
                  ) : (
                    <span key={c.id}>{content}</span>
                  );
                })}
              </div>
            </div>
          )}

          {shop.openingHours != null && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">{t("hours")}</h3>
              <pre className="bg-muted/40 text-muted-foreground rounded-md p-3 text-xs whitespace-pre-wrap">
                {typeof shop.openingHours === "string"
                  ? shop.openingHours
                  : JSON.stringify(shop.openingHours, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">{t("products")}</h3>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]">
          {filteredProducts.map((p) => (
            <UserProductCard
              key={p.id}
              product={toProductCardData(p, shop)}
              isInCart={isSelected(p.id)}
              onAddToMap={() =>
                mapPinsAddToMap({ id: p.id, shop: { svgId: shop.svgId } })
              }
              onShowDetails={() => handleViewProduct(p.id)}
              showShopInfo={false}
            />
          ))}
        </div>

        {hasMore && <div ref={sentinelRef} className="h-8" />}

        {loadingMore && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]">
            {Array.from({ length: 3 }).map((_, i) => (
              <UserProductCardSkeleton key={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ===========================================================================
  // Layout
  // ===========================================================================
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden">
      {/* Filter Sidebar */}
      {!isMobile && filterOpen && (
        <div className="w-64 shrink-0 p-3 transition-all duration-200">
          <div className="border-accent bg-background h-full overflow-y-auto rounded-lg border-4 p-4 shadow-lg">
            <ProductFilterPanel
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              maxPrice={maxPrice}
              activeFiltersCount={activeFiltersCount}
              onReset={handleResetFilters}
            />
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">{shopContent}</div>

      {/* Map sidebar (desktop) */}
      {!isMobile && mapOpen && (
        <div className="w-1/3 shrink-0 p-3 transition-all duration-200">
          <div className="border-accent h-full rounded-lg border-4 shadow-lg">
            <MapPanel {...mapPanelProps} />
          </div>
        </div>
      )}

      <ProductDetailModal
        productId={selectedProductId}
        onClose={handleCloseProductDetail}
        onRemoveFromMap={handleRemoveSelectedFromMap}
        context="user"
      />
    </div>
  );
});
