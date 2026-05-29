"use client";

import React, { memo, useCallback, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Check, ExternalLink, ImageOff, MapPin, Package } from "lucide-react";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { formatShopLocation } from "@/lib/utils/format-shop-location";
import type { ShopListItem, ShopSeller } from "@/hooks/use-shops";

export interface ShopCardProps {
  shop: ShopListItem;
  variant?: "default" | "compact";
  showSellerInfo?: boolean;
  className?: string;
  priority?: boolean;
  onShopClick?: (shop: ShopListItem) => void;
}

function ShopImage({
  src,
  alt,
  priority = false,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  const t = useTranslations("shops.card");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

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
}

function SellerInfo({ seller }: { seller: ShopSeller | null }) {
  const t = useTranslations("shops.card");

  if (!seller) return null;

  return (
    <div className="flex items-center gap-2">
      {seller.logoUrl ? (
        <Image
          src={seller.logoUrl}
          alt={seller.businessName || "Seller"}
          width={24}
          height={24}
          className="rounded-full object-cover"
        />
      ) : (
        <div className="bg-muted flex h-6 w-6 items-center justify-center rounded-full">
          <Package className="text-muted-foreground h-3 w-3" />
        </div>
      )}
      <span className="text-muted-foreground truncate text-xs">
        {seller.businessName || t("unknownSeller")}
      </span>
      {seller.isVerified && (
        <Badge variant="secondary" className="ml-auto text-xs">
          <Check className="mr-1 h-3 w-3" />
          {t("verified")}
        </Badge>
      )}
    </div>
  );
}

function LocationInfo({
  venue,
  building,
  floor,
}: {
  venue: string;
  building: string | null;
  floor: string | null;
}) {
  const locationParts = [building, floor].filter(Boolean);
  const locationString =
    locationParts.length > 0 ? locationParts.join(", ") : venue;

  return (
    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
      <MapPin className="h-3 w-3 flex-shrink-0" />
      <span className="truncate">{locationString}</span>
    </div>
  );
}

export const ShopCard = memo(function ShopCard({
  shop,
  variant = "default",
  showSellerInfo = true,
  className,
  priority = false,
  // Accepted from ShopGrid for API parity but currently not wired to any
  // element — the card itself uses an inner <Link>. Prefixed to silence
  // no-unused-vars without breaking the public prop surface.
  onShopClick: _onShopClick,
}: ShopCardProps) {
  const t = useTranslations("shops.card");

  const tCommon = useTranslations("common");
  const shopName = shop.shopName || formatShopLocation(shop.fullCode, tCommon);
  const sellerName = shop.seller?.businessName;

  if (variant === "compact") {
    return (
      <Card className={cn("group overflow-hidden", className)}>
        <Link href={`/shops/${shop.fullCode}`} className="block">
          <div className="flex gap-3 p-3">
            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md">
              <ShopImage
                src={shop.imageUrl}
                alt={shopName}
                className="h-full w-full"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div>
                <h3 className="line-clamp-2 text-sm font-medium">{shopName}</h3>
                {sellerName && (
                  <p className="text-muted-foreground mt-1 truncate text-xs">
                    {sellerName}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between">
                <LocationInfo
                  venue={shop.venue}
                  building={shop.building}
                  floor={shop.floor}
                />
                {shop.productCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {shop.productCount}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Link>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300",
        "hover:shadow-primary/5 hover:-translate-y-1 hover:shadow-lg",
        className
      )}
    >
      <Link href={`/shops/${shop.fullCode}`} className="block">
        <div className="bg-muted relative aspect-square overflow-hidden">
          <ShopImage
            src={shop.imageUrl}
            alt={shopName}
            priority={priority}
            className="h-full w-full transition-transform duration-300 group-hover:scale-105"
          />

          {shop.productCount > 0 && (
            <Badge
              variant="secondary"
              className="bg-background/80 absolute top-2 right-2 backdrop-blur-sm"
            >
              <Package className="mr-1 h-3 w-3" />
              {t("productCount", { count: shop.productCount })}
            </Badge>
          )}
        </div>
      </Link>

      <CardContent className="p-4">
        <Link href={`/shops/${shop.fullCode}`} className="block space-y-2">
          {sellerName && showSellerInfo && (
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {sellerName}
            </p>
          )}

          <h3 className="group-hover:text-primary line-clamp-2 leading-tight font-semibold transition-colors">
            {shopName}
          </h3>

          {shop.description && (
            <p className="text-muted-foreground line-clamp-2 text-sm">
              {shop.description}
            </p>
          )}
        </Link>

        <div className="mt-3">
          <LocationInfo
            venue={shop.venue}
            building={shop.building}
            floor={shop.floor}
          />
        </div>

        {showSellerInfo && shop.seller && (
          <div className="mt-3">
            <SellerInfo seller={shop.seller} />
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2 p-4 pt-0">
        <Button variant="outline" size="sm" className="flex-1" asChild>
          <Link href={`/shops/${shop.fullCode}`}>
            {t("viewDetails")}
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
});

export function ShopCardSkeleton({
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
      </CardFooter>
    </Card>
  );
}

export default ShopCard;
