"use client";

import { useState, useCallback, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import type {
  CalculatedRoute,
  WayfindingData,
  WayfindingEntrance,
} from "@/lib/wayfinding";

export interface EntranceInfo extends WayfindingEntrance {
  venue: string;
  building: string | null;
  floor: string;
}

export interface WayfindingState {
  /** Whether wayfinding mode is active */
  isActive: boolean;
  /** Loading state for data fetching */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** All available entrances across floors */
  entrances: EntranceInfo[];
  /** Currently selected entrance/start point */
  selectedEntranceId: string | null;
  /** Destination shop SVG ID */
  destinationObjectId: string | null;
  /** Calculated route */
  route: CalculatedRoute | null;
  /** Whether the route path is being animated (drawing) */
  isAnimating: boolean;
}

export interface UseWayfindingReturn extends WayfindingState {
  /** Load wayfinding data (entrances) */
  loadWayfindingData: () => Promise<void>;
  /** Select an entrance as starting point */
  selectEntrance: (entranceId: string) => void;
  /** Navigate to a shop */
  navigateToShop: (objectId: string) => Promise<void>;
  /** Clear the current route */
  clearRoute: () => void;
  /** Toggle wayfinding mode on/off */
  toggleWayfinding: (active?: boolean) => void;
  /** Get the route segment for the current floor */
  getRoutePathForFloor: (
    venue: string,
    building: string | null,
    floor: string
  ) => string | null;
}

export function useWayfinding(): UseWayfindingReturn {
  const [state, setState] = useState<WayfindingState>({
    isActive: false,
    isLoading: false,
    error: null,
    entrances: [],
    selectedEntranceId: null,
    destinationObjectId: null,
    route: null,
    isAnimating: false,
  });

  const loadWayfindingData = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const res = await apiClient.get<{
        floors: Array<{
          venue: string;
          building: string | null;
          floor: string;
          wayfindingData: WayfindingData | null;
        }>;
        entrances: EntranceInfo[];
      }>("/mall/maps/wayfinding", {}, { showErrorToast: false });

      if (!res.success) {
        throw new Error(res.error.message);
      }

      setState((s) => ({
        ...s,
        isLoading: false,
        entrances: res.data.entrances,
        // Auto-select first entrance if only one
        selectedEntranceId:
          res.data.entrances.length === 1
            ? res.data.entrances[0].id
            : s.selectedEntranceId,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to load wayfinding data",
      }));
    }
  }, []);

  const selectEntrance = useCallback((entranceId: string) => {
    setState((s) => ({
      ...s,
      selectedEntranceId: entranceId,
      // Clear existing route when entrance changes
      route: null,
      destinationObjectId: null,
    }));
  }, []);

  const navigateToShop = useCallback(
    async (objectId: string) => {
      if (!state.selectedEntranceId) {
        setState((s) => ({
          ...s,
          error: "Please select an entrance first",
        }));
        return;
      }

      setState((s) => ({
        ...s,
        isLoading: true,
        error: null,
        destinationObjectId: objectId,
      }));

      try {
        const res = await apiClient.post<{
          found: boolean;
          route: CalculatedRoute | null;
          message?: string;
        }>(
          "/mall/maps/calculate-route",
          {
            startEntranceId: state.selectedEntranceId,
            destinationObjectId: objectId,
          },
          { showErrorToast: false }
        );

        if (!res.success) {
          throw new Error(res.error.message);
        }

        if (!res.data.found || !res.data.route) {
          setState((s) => ({
            ...s,
            isLoading: false,
            error: res.data.message || "No path found to this location",
            route: null,
          }));
          return;
        }

        setState((s) => ({
          ...s,
          isLoading: false,
          route: res.data.route,
          isAnimating: true,
        }));

        // End animation after path drawing completes
        setTimeout(() => {
          setState((s) => ({ ...s, isAnimating: false }));
        }, 1500);
      } catch (err) {
        setState((s) => ({
          ...s,
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to calculate route",
          route: null,
        }));
      }
    },
    [state.selectedEntranceId]
  );

  const clearRoute = useCallback(() => {
    setState((s) => ({
      ...s,
      route: null,
      destinationObjectId: null,
      error: null,
      isAnimating: false,
    }));
  }, []);

  const toggleWayfinding = useCallback((active?: boolean) => {
    setState((s) => {
      const newActive = active !== undefined ? active : !s.isActive;
      return {
        ...s,
        isActive: newActive,
        // Clear route when disabling
        ...(newActive ? {} : { route: null, destinationObjectId: null }),
      };
    });
  }, []);

  const getRoutePathForFloor = useCallback(
    (venue: string, building: string | null, floor: string): string | null => {
      if (!state.route) return null;

      const segment = state.route.segments.find(
        (s) => s.venue === venue && s.building === building && s.floor === floor
      );

      return segment?.pathData ?? null;
    },
    [state.route]
  );

  // Load wayfinding data when mode is activated
  useEffect(() => {
    if (state.isActive && state.entrances.length === 0 && !state.isLoading) {
      loadWayfindingData();
    }
  }, [state.isActive, state.entrances.length, state.isLoading, loadWayfindingData]);

  return {
    ...state,
    loadWayfindingData,
    selectEntrance,
    navigateToShop,
    clearRoute,
    toggleWayfinding,
    getRoutePathForFloor,
  };
}
