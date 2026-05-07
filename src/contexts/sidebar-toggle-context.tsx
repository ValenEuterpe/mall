"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useLocalStorageToggle } from "@/hooks/use-local-storage";
import { useIsMobile } from "@/hooks/use-media-query";
import {
  MobilePanelProvider,
  useMobilePanelContext,
  type MobilePanelName,
} from "@/contexts/mobile-panel-context";

/**
 * Sidebar/panel toggle context.
 *
 * Desktop: panels are persistent sidebars whose open/closed state lives in
 * localStorage so it survives navigation.
 *
 * Mobile: panels are transient bottom sheets managed by MobilePanelProvider —
 * only one open at a time. The toggle helpers route to the right backend
 * automatically based on viewport, so callers (header buttons, etc.) don't
 * need to know.
 *
 * Adding a new panel:
 *   1. Pick a stable name (e.g. "cart").
 *   2. Add a localStorage key here for the desktop sidebar state.
 *   3. Wire toggle/open/close in this provider mirroring the map/filter pattern.
 *   4. Render the page-side panel via <MobilePanelSheet name="cart">.
 */

const PANEL_NAMES = {
  map: "map" as const,
  filter: "filter" as const,
} satisfies Record<string, MobilePanelName>;

interface SidebarToggleContextValue {
  filterOpen: boolean;
  mapOpen: boolean;
  toggleFilter: () => void;
  toggleMap: () => void;
  setFilterOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  setMapOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
}

const NOOP = () => {};
const NOOP_SET = () => {};

const DEFAULT_VALUE: SidebarToggleContextValue = {
  filterOpen: false,
  mapOpen: false,
  toggleFilter: NOOP,
  toggleMap: NOOP,
  setFilterOpen: NOOP_SET,
  setMapOpen: NOOP_SET,
};

const SidebarToggleContext =
  createContext<SidebarToggleContextValue>(DEFAULT_VALUE);

function SidebarToggleInner({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const isMobile = useIsMobile();
  const mobilePanel = useMobilePanelContext();

  const [filterStored, toggleFilterStored, setFilterStored] =
    useLocalStorageToggle("wm:filter-sidebar", false);
  const [mapStored, toggleMapStored, setMapStored] = useLocalStorageToggle(
    "wm:map-sidebar",
    true
  );

  // Reflect open state per viewport. Desktop reads localStorage; mobile reads
  // the active panel registry. Keeping a single boolean per feature lets
  // existing consumers (e.g. Header button highlight) keep working unchanged.
  const filterOpen = isMobile
    ? mobilePanel.activePanel === PANEL_NAMES.filter
    : filterStored;
  const mapOpen = isMobile
    ? mobilePanel.activePanel === PANEL_NAMES.map
    : mapStored;

  const toggleFilter = isMobile
    ? () => mobilePanel.toggle(PANEL_NAMES.filter)
    : toggleFilterStored;
  const toggleMap = isMobile
    ? () => mobilePanel.toggle(PANEL_NAMES.map)
    : toggleMapStored;

  // Imperative setters stay desktop-only; mobile panels should be driven via
  // toggle/open/close on the panel context, not coerced through a boolean.
  return (
    <SidebarToggleContext.Provider
      value={{
        filterOpen,
        mapOpen,
        toggleFilter,
        toggleMap,
        setFilterOpen: setFilterStored,
        setMapOpen: setMapStored,
      }}
    >
      {children}
    </SidebarToggleContext.Provider>
  );
}

export function SidebarToggleProvider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <MobilePanelProvider>
      <SidebarToggleInner>{children}</SidebarToggleInner>
    </MobilePanelProvider>
  );
}

export function useSidebarToggle(): SidebarToggleContextValue {
  return useContext(SidebarToggleContext);
}

export const SIDEBAR_PANELS = PANEL_NAMES;
