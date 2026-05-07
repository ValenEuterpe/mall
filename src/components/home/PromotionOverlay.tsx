"use client";

import React, { memo, useRef, useEffect, useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import type { PromotionProduct } from "@/hooks/use-promotions";

// ============================================================================
// Types
// ============================================================================

interface PromotionOverlayProps {
  promotion: PromotionProduct | null;
  position: { x: number; y: number } | null;
  isFading: boolean;
  animationKey: number;
  onViewProduct: (productId: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export const PromotionOverlay = memo(function PromotionOverlay({
  promotion,
  position,
  isFading,
  animationKey,
  onViewProduct,
}: PromotionOverlayProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0, perimeter: 0 });

  // Measure the card dimensions for the border animation
  useEffect(() => {
    if (!cardRef.current) return;
    const el = cardRef.current;
    const measure = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setDims({ w, h, perimeter: 2 * (w + h) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [promotion?.id]);

  if (!promotion || !position) return null;

  const thumbnail = promotion.images[0];
  const hasDiscount =
    promotion.hasDiscount && promotion.effectivePrice != null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[35]">
      <div
        className="pointer-events-auto cursor-pointer"
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          zIndex: 35,
          transform: "translate(-50%, -110%)",
        }}
        onClick={() => onViewProduct(promotion.id)}
      >
        <div
          className={`relative transition-opacity duration-300 ${
            isFading ? "opacity-0" : "opacity-100"
          }`}
        >
          {/* Card content */}
          <div
            ref={cardRef}
            className="bg-card relative flex items-center gap-2 overflow-hidden rounded-xl p-2 shadow-lg"
          >
            {/* Animated rectangular border */}
            {dims.perimeter > 0 && (
              <svg
                key={animationKey}
                className="pointer-events-none absolute inset-0 z-10"
                viewBox={`0 0 ${dims.w} ${dims.h}`}
                width={dims.w}
                height={dims.h}
              >
                {/* Background track */}
                <rect
                  x="1.5"
                  y="1.5"
                  width={dims.w - 3}
                  height={dims.h - 3}
                  rx="11"
                  ry="11"
                  fill="none"
                  stroke="hsl(var(--muted-foreground) / 0.15)"
                  strokeWidth="2"
                />
                {/* Animated progress */}
                <rect
                  x="1.5"
                  y="1.5"
                  width={dims.w - 3}
                  height={dims.h - 3}
                  rx="11"
                  ry="11"
                  fill="none"
                  stroke="hsl(0 84.2% 60.2%)"
                  strokeWidth="2.5"
                  strokeDasharray={dims.perimeter}
                  strokeLinecap="round"
                  style={{
                    ["--promo-perimeter" as string]: dims.perimeter,
                    animation: "promotion-timer-rect 6s linear forwards",
                  }}
                />
              </svg>
            )}

            {/* Thumbnail */}
            <div className="bg-muted relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg">
              {thumbnail ? (
                <Image
                  src={thumbnail}
                  alt={promotion.name}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageOff className="text-muted-foreground h-5 w-5" />
                </div>
              )}

              {/* Discount badge */}
              {promotion.hasDiscount && promotion.discount && (
                <div className="bg-destructive text-destructive-foreground absolute bottom-0 left-0 rounded-tr-md px-1 text-[9px] font-bold">
                  {promotion.discount.type === "percentage"
                    ? `-${promotion.discount.value}%`
                    : `-${Number(promotion.discount.value).toLocaleString()} ֏`}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 max-w-[120px]">
              <p className="line-clamp-1 text-xs font-medium leading-tight">
                {promotion.name}
              </p>

              {/* Price */}
              {hasDiscount ? (
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-destructive text-xs font-semibold">
                    {promotion.effectivePrice.toLocaleString()} ֏
                  </span>
                  <span className="text-muted-foreground text-[10px] line-through">
                    {Number(promotion.basePrice).toLocaleString()} ֏
                  </span>
                </div>
              ) : (
                <p className="text-accent-foreground mt-0.5 text-xs font-semibold">
                  {Number(promotion.basePrice).toLocaleString()} ֏
                </p>
              )}

              {/* Shop name */}
              {promotion.shop.name && (
                <p className="text-muted-foreground mt-0.5 truncate text-[10px]">
                  {promotion.shop.name}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
