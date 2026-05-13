"use client";

import React, { memo, useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Heart, MapPin, ShoppingCart, ImageOff } from "lucide-react";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/utils/toast";
import { useMapSelection } from "@/hooks/use-map-selection";
import { useCart } from "@/hooks/use-cart";
import { formatShopLocation } from "@/lib/utils/format-shop-location";
import { useRouter } from "@/i18n/routing";
import { StorefrontIcon } from "@/components/icons/Storefront";
import type { ProductCardData, ProductCardShop } from "@/types/product";
import type { CartProduct } from "@/lib/cart/types";
import { getStockStatus, formatPrice } from "@/types/product";

export interface UserProductCardProps {
  product: ProductCardData;
  variant?: "default" | "compact";
  isInCart?: boolean;
  isFavorite?: boolean;
  onAddToMap?: () => void;
  /**
   * Called when the user presses the footer button while the product is on the
   * map. When the parent owns the map-selection state (home/search/shop pages),
   * pass this so removal is delegated to the parent — keeping the parent's
   * `isInCart` prop authoritative. When omitted, the card falls back to its
   * internal `useMapSelection` instance.
   */
  onRemoveFromMap?: () => void;
  onToggleFavorite?: () => void;
  onShowDetails?: () => void;
  showShopInfo?: boolean;
  priority?: boolean;
  className?: string;
}

interface ProductImageProps {
  src: string | undefined;
  alt: string;
  priority?: boolean;
  className?: string;
}

const ProductImage = memo(function ProductImage({
  src,
  alt,
  priority = false,
  className,
}: ProductImageProps) {
  const t = useTranslations("products.card");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => setIsLoading(false), []);
  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  if (!src || hasError) {
    return (
      <div
        className={cn(
          "bg-muted text-muted-foreground flex flex-col items-center justify-center",
          className
        )}
      >
        <ImageOff className="mb-2 h-8 w-8" />
        <span className="text-xs">{t("noImage")}</span>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {isLoading && <Skeleton className="absolute inset-0" />}
      <Image
        src={src}
        alt={alt}
        fill
        quality={90}
        priority={priority}
        className={cn(
          "object-cover transition-all duration-300",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
});

interface ShopInfoProps {
  shop: ProductCardShop;
}

const ShopInfo = memo(function ShopInfo({ shop }: ShopInfoProps) {
  const tCommon = useTranslations("common");
  const displayName = shop.shopName || shop.businessName || formatShopLocation(shop.fullCode, tCommon);
  const locationParts = [shop.building, shop.floor].filter(Boolean);
  const locationString =
    locationParts.length > 0 ? locationParts.join(", ") : null;

  return (
    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
      <MapPin className="h-3 w-3 flex-shrink-0" />
      <span className="truncate">{displayName}</span>
      {locationString && (
        <>
          <span className="text-muted-foreground/50">-</span>
          <span className="truncate">{locationString}</span>
        </>
      )}
    </div>
  );
});

interface QuickActionButtonsProps {
  isFavorite: boolean;
  isInShoppingCart: boolean;
  onToggleFavorite?: () => void;
  onAddToCart?: () => void;
  shopFullCode: string | null | undefined;
}

const QuickActionButtons = memo(function QuickActionButtons({
  isFavorite,
  isInShoppingCart,
  onToggleFavorite,
  onAddToCart,
  shopFullCode,
}: QuickActionButtonsProps) {
  const t = useTranslations("products.card");
  const router = useRouter();

  const handleFavoriteClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onToggleFavorite?.();
    },
    [onToggleFavorite]
  );

  const handleCartClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onAddToCart?.();
    },
    [onAddToCart]
  );

  const handleShopClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (shopFullCode) {
        router.push(`/shops/${shopFullCode}`);
      }
    },
    [router, shopFullCode]
  );

  return (
    <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="bg-background/80 hover:bg-background h-8 w-8 backdrop-blur-sm"
              onClick={handleFavoriteClick}
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  isFavorite && "fill-yellow-400 text-yellow-400"
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {isFavorite
              ? t("quickActions.wishlistRemove")
              : t("quickActions.wishlistAdd")}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="bg-background/80 hover:bg-background h-8 w-8 backdrop-blur-sm"
              onClick={handleCartClick}
            >
              <ShoppingCart
                className={cn(
                  "h-4 w-4",
                  isInShoppingCart && "fill-primary text-primary"
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">{t("addToCart")}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="bg-background/80 hover:bg-background h-8 w-8 backdrop-blur-sm"
              onClick={handleShopClick}
            >
              <StorefrontIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {t("quickActions.viewShop")}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
});

export const UserProductCard = memo(function UserProductCard({
  product,
  variant = "default",
  isInCart: isInCartProp,
  isFavorite = false,
  onAddToMap,
  onRemoveFromMap,
  onToggleFavorite,
  onShowDetails,
  showShopInfo = true,
  priority = false,
  className,
}: UserProductCardProps) {
  const t = useTranslations("products.card");
  const tProducts = useTranslations("products");
  const locale = useLocale();

  const { addProduct, removeProduct, isSelected } = useMapSelection();
  const { addItem, isInCart: cartIsInCart } = useCart();
  const inRoute = isInCartProp ?? isSelected(product.id);
  const inShoppingCart = cartIsInCart(product.id);
  const inStock = product.stockQuantity > 0;
  const stockStatus = getStockStatus(product.stockQuantity);
  const primaryImage = product.images?.[0];

  const categoryLabel = useMemo(() => {
    if (!product.category) return null;
    return locale === "ru"
      ? product.category.name_ru
      : product.category.name_en;
  }, [product.category, locale]);

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.defaultPrevented) return;
      onShowDetails?.();
    },
    [onShowDetails]
  );

  const handleAddToCart = useCallback(() => {
    if (inShoppingCart) {
      toast.info(t("alreadyInCart"));
      return;
    }

    if (!inStock) {
      toast.error(t("outOfStock"));
      return;
    }

    const cartProduct: CartProduct = {
      id: product.id,
      name: product.name,
      price:
        product.hasDiscount && product.effectivePrice != null
          ? Number(product.effectivePrice)
          : Number(product.basePrice),
      images: product.images,
      shopId: product.shop?.id ?? "",
      shopName: product.shop?.shopName ?? undefined,
      shopCode: product.shop?.fullCode ?? undefined,
      shopLocation: product.shop
        ? {
            venue: product.shop.venue ?? "",
            building: product.shop.building ?? undefined,
            floor: product.shop.floor ?? undefined,
            svgId: product.shop.svgId ?? undefined,
          }
        : undefined,
    };

    addItem(cartProduct);
    toast.success(t("addedToCart"));
  }, [addItem, inShoppingCart, inStock, product, t]);

  const handleToggleMapClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (inRoute) {
        // Delegate to the parent when it owns the canonical selection state
        // (home/search/shop pages); otherwise fall back to local mutation.
        if (onRemoveFromMap) {
          onRemoveFromMap();
          return;
        }
        removeProduct(product.id);
        toast.success(tProducts("removedFromMap"));
        return;
      }

      if (!inStock) {
        toast.error(t("outOfStock"));
        return;
      }

      addProduct(product.id);
      onAddToMap?.();

      toast.success(t("addedToRoute"), {
        description: t("addedToRouteDescription"),
      });
    },
    [
      addProduct,
      inRoute,
      inStock,
      onAddToMap,
      onRemoveFromMap,
      product.id,
      removeProduct,
      t,
      tProducts,
    ]
  );

  const handleShowDetailsClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onShowDetails?.();
    },
    [onShowDetails]
  );

  const formattedPrice = useMemo(
    () => formatPrice(Number(product.basePrice), locale),
    [product.basePrice, locale]
  );

  const formattedEffectivePrice = useMemo(() => {
    if (!product.hasDiscount || product.effectivePrice == null) return null;
    return formatPrice(Number(product.effectivePrice), locale);
  }, [product.hasDiscount, product.effectivePrice, locale]);

  if (variant === "compact") {
    return (
      <Card
        className={cn("group cursor-pointer overflow-hidden", className)}
        onClick={handleCardClick}
      >
        <div className="flex gap-3 p-3">
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md">
            <ProductImage
              src={primaryImage}
              alt={product.name}
              className="h-full w-full"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <div>
              <h3 className="line-clamp-2 text-sm font-medium">
                {product.name}
              </h3>
              {showShopInfo && product.shop && <ShopInfo shop={product.shop} />}
            </div>
            {formattedEffectivePrice ? (
              <div className="flex items-baseline gap-1.5">
                <p className="text-destructive font-bold">
                  {formattedEffectivePrice}
                </p>
                <p className="text-muted-foreground text-xs line-through">
                  {formattedPrice}
                </p>
              </div>
            ) : (
              <p className="text-primary font-bold">{formattedPrice}</p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "group relative cursor-pointer overflow-hidden transition-all duration-300",
        "hover:shadow-primary/5 hover:-translate-y-1 hover:shadow-lg",
        className
      )}
      onClick={handleCardClick}
    >
      <div className="bg-muted relative aspect-square overflow-hidden">
        <ProductImage
          src={primaryImage}
          alt={product.name}
          priority={priority}
          className="h-full w-full transition-transform duration-300 group-hover:scale-105"
        />

        {stockStatus.status === "out" && (
          <Badge
            variant={stockStatus.variant}
            className="absolute top-2 left-2"
          >
            {t("stock.out")}
          </Badge>
        )}

        {stockStatus.status === "low" && (
          <Badge
            variant={stockStatus.variant}
            className={cn("absolute top-2 left-2", stockStatus.className)}
          >
            {t("stock.low", { count: stockStatus.quantity })}
          </Badge>
        )}

        {product.hasDiscount && product.discount && (
          <Badge variant="destructive" className="absolute top-2 right-2">
            {product.discount.type === "percentage"
              ? `-${product.discount.value}%`
              : `-${formatPrice(Number(product.discount.value), locale)}`}
          </Badge>
        )}

        <QuickActionButtons
          isFavorite={isFavorite}
          isInShoppingCart={inShoppingCart}
          onToggleFavorite={onToggleFavorite}
          onAddToCart={handleAddToCart}
          shopFullCode={product.shop?.fullCode}
        />

        {product.category && (
          <Badge
            variant="secondary"
            className="bg-background/80 absolute bottom-2 left-2 backdrop-blur-sm"
          >
            {categoryLabel}
          </Badge>
        )}
      </div>

      <CardContent className="p-4">
        <div className="space-y-2">
          {product.brand && (
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {product.brand}
            </p>
          )}

          <h3 className="group-hover:text-primary line-clamp-2 leading-tight font-semibold transition-colors">
            {product.name}
          </h3>

          {product.description && (
            <p className="text-muted-foreground line-clamp-2 text-sm">
              {product.description}
            </p>
          )}
        </div>

        {showShopInfo && product.shop && (
          <div className="mt-3">
            <ShopInfo shop={product.shop} />
          </div>
        )}

        <div className="mt-3 flex items-baseline justify-between">
          {formattedEffectivePrice ? (
            <div className="flex items-baseline gap-2">
              <p className="text-destructive text-xl font-bold">
                {formattedEffectivePrice}
              </p>
              <p className="text-muted-foreground text-sm line-through">
                {formattedPrice}
              </p>
            </div>
          ) : (
            <p className="text-primary text-xl font-bold">{formattedPrice}</p>
          )}
        </div>
      </CardContent>

      <CardFooter className="gap-2 p-4 pt-0">
        <Button
          variant={inRoute ? "secondary" : "outline"}
          size="sm"
          className="w-full"
          onClick={handleToggleMapClick}
          disabled={!inStock && !inRoute}
        >
          <MapPin className="mr-1.5 h-4 w-4" />
          {inRoute ? tProducts("removeFromMap") : tProducts("addToMap")}
        </Button>
      </CardFooter>
    </Card>
  );
});

export function UserProductCardSkeleton({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <Skeleton className="aspect-square w-full" />
      <CardContent className="space-y-3 p-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-20" />
      </CardContent>
      <CardFooter className="gap-2 p-4 pt-0">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 flex-1" />
      </CardFooter>
    </Card>
  );
}

export default UserProductCard;
