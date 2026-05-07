"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Navigation, Clock, Ruler, ArrowRight, ArrowUp, Footprints } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatWalkingTime, formatDistance, type CalculatedRoute, type FloorChange } from "@/lib/wayfinding";

export interface RouteDetailsProps {
  className?: string;
  route: CalculatedRoute;
  destinationName?: string;
  variant?: "card" | "inline";
}

function FloorChangeIcon({ type }: { type: FloorChange["type"] }) {
  switch (type) {
    case "elevator":
      return <ArrowUp className="h-4 w-4" />;
    case "stairs":
      return <Footprints className="h-4 w-4" />;
    case "escalator":
      return <ArrowUp className="h-4 w-4 rotate-45" />;
    default:
      return null;
  }
}

export function RouteDetails({
  className,
  route,
  destinationName,
  variant = "card",
}: RouteDetailsProps) {
  const t = useTranslations("map.wayfinding");

  const formattedTime = formatWalkingTime(route.estimatedTime);
  const formattedDistance = formatDistance(route.totalDistance);

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-4 text-sm", className)}>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Ruler className="h-4 w-4" />
          <span>{formattedDistance}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{formattedTime}</span>
        </div>
        {route.floorChanges.length > 0 && (
          <div className="flex items-center gap-1.5">
            {route.floorChanges.map((fc, i) => (
              <Badge key={i} variant="secondary" className="gap-1 text-xs">
                <FloorChangeIcon type={fc.type} />
                {fc.fromFloor} → {fc.toFloor}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Navigation className="h-4 w-4 text-primary" />
          {destinationName ?? t("routeDetails")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{formattedDistance}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{formattedTime}</span>
          </div>
        </div>

        {route.floorChanges.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("floorChanges")}:</p>
            <div className="flex flex-wrap gap-2">
              {route.floorChanges.map((fc, i) => (
                <Badge key={i} variant="outline" className="gap-1.5">
                  <FloorChangeIcon type={fc.type} />
                  <span>{fc.name}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span>
                    {t("floor")} {fc.toFloor}
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {route.segments.length > 1 && (
          <div className="text-xs text-muted-foreground">
            {t("routeSpans", { floors: route.segments.length })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
