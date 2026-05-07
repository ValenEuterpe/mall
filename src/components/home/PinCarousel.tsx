"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Store, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import { PinCarouselSlide } from "./PinCarouselSlide";

interface PinCarouselData {
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

interface PinCarouselProps {
  pins: PinCarouselData[];
  shopName: string;
  shopCode?: string;
  shopImageUrl?: string;
  position: { x: number; y: number };
  onClose: () => void;
  onRemoveProduct: (productId: string) => void;
  onViewProduct: (productId: string) => void;
}

export const PinCarousel = memo(function PinCarousel({
  pins,
  shopName,
  shopCode,
  shopImageUrl,
  position,
  onClose,
  onRemoveProduct,
  onViewProduct,
}: PinCarouselProps) {
  const t = useTranslations("home.products");
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollTop / el.clientHeight);
    setActiveIndex(Math.max(0, Math.min(index, pins.length - 1)));
  }, [pins.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const handleRemove = useCallback(
    (productId: string) => {
      onRemoveProduct(productId);
      if (pins.length <= 1) {
        onClose();
      }
    },
    [onRemoveProduct, pins.length, onClose]
  );

  const pinStyle: React.CSSProperties = {
    position: "fixed",
    left: position.x,
    top: position.y,
    zIndex: 41,
    transform: "translate(-50%, -100%)",
    marginTop: "-12px",
  };

  return (
    <div style={pinStyle}>
      <Card className="w-70 overflow-hidden shadow-lg">
        <div className="flex items-center justify-between border-b px-2 py-1.5">
          {shopCode ? (
            <Link
              href={`/shops/${shopCode}`}
              onClick={onClose}
              className="flex min-w-0 flex-1 items-center gap-1.5"
            >
              <span className="relative h-6 w-6 flex-shrink-0 overflow-hidden rounded-full">
                {shopImageUrl ? (
                  <Image
                    src={shopImageUrl}
                    alt={shopName}
                    fill
                    sizes="24px"
                    className="object-cover"
                  />
                ) : (
                  <Store className="text-muted-foreground h-4 w-4" />
                )}
              </span>
              <span className="truncate text-sm font-medium">{shopName}</span>
            </Link>
          ) : (
            <span className="truncate text-sm font-medium">{shopName}</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        <CardContent className="p-0">
          <div
            ref={scrollRef}
            className="pin-carousel overflow-y-auto"
            style={{ maxHeight: "240px" }}
          >
            {pins.map((pin) => (
              <PinCarouselSlide
                key={pin.productId}
                pin={pin}
                onView={() => onViewProduct(pin.productId)}
                onRemove={() => handleRemove(pin.productId)}
              />
            ))}
          </div>
        </CardContent>

        {pins.length > 1 && (
          <div className="flex justify-center gap-1.5 py-2">
            {pins.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === activeIndex ? "bg-foreground" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
});
