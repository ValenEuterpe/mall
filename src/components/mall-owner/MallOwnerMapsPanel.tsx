"use client";

import React from "react";
import { InteractiveMapEditor } from "./InteractiveMapEditor";

/**
 * MallOwnerMapsPanel - Map management panel for mall owners
 * 
 * This component provides a full-featured map editor that allows mall owners to:
 * - Configure mall location (lat/lng)
 * - Add buildings and outdoor venues
 * - Upload SVG floor plans for each building/venue
 * - Position SVG overlays on OpenStreetMap
 * - Auto-detect shop elements from SVG IDs (pattern: V1B1F1S1)
 */
export function MallOwnerMapsPanel(): React.ReactElement {
  return <InteractiveMapEditor />;
}
