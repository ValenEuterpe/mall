"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";

export interface MapFloorSelectorProps {
  floors: { floor: string; label?: string }[];
  currentFloor: string;
  onFloorChange: (floor: string) => void;
  position: { x: number; y: number };
  visible: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const MapFloorSelector = memo(function MapFloorSelector({
  floors,
  currentFloor,
  onFloorChange,
  position,
  visible,
  onMouseEnter,
  onMouseLeave,
}: MapFloorSelectorProps) {
  const t = useTranslations("home.map");

  const currentIdx = floors.findIndex((f) => f.floor === currentFloor);
  const canUp = currentIdx < floors.length - 1;
  const canDown = currentIdx > 0;
  const label = `${t("floor")} ${floors[currentIdx]?.floor ?? currentFloor}`;

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "absolute",
        left: position.x - 44,
        top: position.y - 40,
        zIndex: 600,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 0.25s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          background: "white",
          borderRadius: 8,
          padding: 4,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <button
          onClick={() => canUp && onFloorChange(floors[currentIdx + 1].floor)}
          disabled={!canUp}
          style={{
            width: 28,
            height: 28,
            border: "none",
            borderRadius: 6,
            background: canUp ? "#f4f4f5" : "transparent",
            cursor: canUp ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: canUp ? 1 : 0.3,
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          &#x25B2;
        </button>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            padding: "0 6px",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        <button
          onClick={() => canDown && onFloorChange(floors[currentIdx - 1].floor)}
          disabled={!canDown}
          style={{
            width: 28,
            height: 28,
            border: "none",
            borderRadius: 6,
            background: canDown ? "#f4f4f5" : "transparent",
            cursor: canDown ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: canDown ? 1 : 0.3,
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          &#x25BC;
        </button>
      </div>
    </div>
  );
});
