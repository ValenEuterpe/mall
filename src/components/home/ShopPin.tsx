"use client";

import React, { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface ShopPinData {
  productId: string;
  svgId: string;
  thumbnail: string;
  name: string;
  price?: number;
  shopName?: string;
}

interface ShopPinProps {
  pins: ShopPinData[];
  position: { x: number; y: number };
  onClick: () => void;
  onRemoveLast: () => void;
}

export const ShopPin = memo(function ShopPin({
  pins,
  position,
  onClick,
  onRemoveLast,
}: ShopPinProps) {
  return (
    <div
      className="fixed z-10 -translate-x-1/2 -translate-y-full cursor-pointer"
      style={{ left: position.x, top: position.y }}
      onClick={onClick}
    >
      <div className="group relative">
        <svg
          className="text-accent h-8 w-8 transition-transform group-hover:scale-110"
          viewBox="0 -960 960 960"
          fill="currentColor"
        >
          <path d="M480-388q54-50 84-80t47-50q16-20 22.5-37t6.5-37q0-36-26-62t-62-26q-21 0-40.5 8.5T480-648q-12-15-31-23.5t-41-8.5q-36 0-62 26t-26 62q0 21 6 37t22 36q17 20 46 50t86 81Zm0 202q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Zm0 106Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Zm0-480Z" />
        </svg>

        {pins.length > 1 && (
          <Badge
            variant="default"
            className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs"
          >
            {pins.length}
          </Badge>
        )}

        <button
          className="bg-destructive text-destructive-foreground absolute -top-1 -right-1 hidden h-4 w-4 items-center justify-center rounded-full group-hover:flex"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveLast();
          }}
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
});
