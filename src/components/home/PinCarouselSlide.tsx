"use client";

import React, { memo } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { ShoppingBag, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PinCarouselSlideData {
  productId: string;
  thumbnail: string;
  name: string;
  price?: number;
  effectivePrice?: number;
  hasDiscount?: boolean;
  discount?: { type: string; value: number } | null;
}

interface PinCarouselSlideProps {
  pin: PinCarouselSlideData;
  onView: () => void;
  onRemove: () => void;
}

export const PinCarouselSlide = memo(function PinCarouselSlide({
  pin,
  onView,
  onRemove,
}: PinCarouselSlideProps) {
  const t = useTranslations("home.products");

  return (
    <div className="snap-start border-b p-3 last:border-b-0">
      <div className="flex gap-3">
        <div className="bg-muted relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
          {pin.thumbnail ? (
            <Image
              src={pin.thumbnail}
              alt={pin.name}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ShoppingBag className="text-muted-foreground/50 h-6 w-6" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <p className="line-clamp-2 text-sm font-medium">{pin.name}</p>
          {pin.price !== undefined && (
            pin.hasDiscount && pin.effectivePrice != null ? (
              <div className="flex items-baseline gap-1.5">
                <p className="text-destructive text-sm font-semibold">
                  {pin.effectivePrice.toLocaleString()} ֏
                </p>
                <p className="text-muted-foreground text-xs line-through">
                  {pin.price.toLocaleString()} ֏
                </p>
              </div>
            ) : (
              <p className="text-accent-foreground text-sm font-semibold">
                {pin.price.toLocaleString()} ֏
              </p>
            )
          )}
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          variant="default"
          className="flex-1 text-xs"
          onClick={onView}
        >
          <Eye className="mr-1 h-3 w-3" />
          {t("viewDetail")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive text-xs"
          onClick={onRemove}
        >
          <X className="mr-1 h-3 w-3" />
          {t("removeFromMap")}
        </Button>
      </div>
    </div>
  );
});
