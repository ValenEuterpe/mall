"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Navigation, MapPin, X, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { EntranceInfo } from "@/hooks/use-wayfinding";

export interface WayfindingControlsProps {
  className?: string;
  isActive: boolean;
  isLoading: boolean;
  entrances: EntranceInfo[];
  selectedEntranceId: string | null;
  hasRoute: boolean;
  onToggle: () => void;
  onSelectEntrance: (entranceId: string) => void;
  onClearRoute: () => void;
}

export function WayfindingControls({
  className,
  isActive,
  isLoading,
  entrances,
  selectedEntranceId,
  hasRoute,
  onToggle,
  onSelectEntrance,
  onClearRoute,
}: WayfindingControlsProps) {
  const t = useTranslations("map.wayfinding");

  if (!isActive) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={cn("gap-2", className)}
        onClick={onToggle}
      >
        <Navigation className="h-4 w-4" />
        {t("enable")}
      </Button>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="flex items-center gap-2 rounded-md border bg-card p-2">
        <MapPin className="h-4 w-4 text-green-600" />
        <Select
          value={selectedEntranceId ?? undefined}
          onValueChange={onSelectEntrance}
          disabled={isLoading}
        >
          <SelectTrigger className="h-8 w-[180px]">
            <SelectValue placeholder={t("selectEntrance")} />
          </SelectTrigger>
          <SelectContent>
            {entrances.map((entrance) => (
              <SelectItem key={entrance.id} value={entrance.id}>
                {entrance.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasRoute && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-destructive hover:text-destructive"
          onClick={onClearRoute}
        >
          <X className="h-4 w-4" />
          {t("clearRoute")}
        </Button>
      )}

      <Button variant="ghost" size="sm" onClick={onToggle}>
        {t("disable")}
      </Button>

      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  );
}
