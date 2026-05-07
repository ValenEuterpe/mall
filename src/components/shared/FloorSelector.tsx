"use client";

import { memo, useMemo } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface FloorSelectorProps {
  floors: { floor: string; label?: string }[];
  currentFloor: string;
  onChange: (floor: string) => void;
  floorLabel?: string;
  floorsLabel?: string;
}

export const FloorSelector = memo(function FloorSelector({
  floors,
  currentFloor,
  onChange,
  floorLabel = "Floor",
}: FloorSelectorProps) {
  if (floors.length <= 1) return null;

  const currentIndex = useMemo(
    () => floors.findIndex((f) => f.floor === currentFloor),
    [floors, currentFloor]
  );

  const currentFloorData = currentIndex >= 0 ? floors[currentIndex] : null;
  const canGoUp = currentIndex < floors.length - 1;
  const canGoDown = currentIndex > 0;

  const handleUp = (): void => {
    if (canGoUp) onChange(floors[currentIndex + 1].floor);
  };

  const handleDown = (): void => {
    if (canGoDown) onChange(floors[currentIndex - 1].floor);
  };

  const displayLabel =
    currentFloorData?.label || `${floorLabel} ${currentFloorData?.floor ?? currentFloor}`;

  return (
    <div className="absolute bottom-4 left-4 z-10">
      <Card className="shadow-lg">
        <CardContent className="flex flex-col items-center gap-0.5 p-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleUp}
            disabled={!canGoUp}
            aria-label="Go up one floor"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium px-2 whitespace-nowrap">
            {displayLabel}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleDown}
            disabled={!canGoDown}
            aria-label="Go down one floor"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
});
