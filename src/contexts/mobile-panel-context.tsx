"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Generic mobile panel registry.
 *
 * Any feature (map, filter, cart preview, etc.) registers itself by name and
 * gets open/close/toggle helpers that route through a single context. Only one
 * panel is open at a time on mobile, so opening another auto-closes the
 * previous one without each feature having to coordinate.
 *
 * Pages render <MobilePanelSheet name="map">…</MobilePanelSheet> and toggle
 * with useMobilePanel("map").toggle(). The header doesn't need to know which
 * panel exists on which page — it just calls toggle.
 */

export type MobilePanelName = string;

interface MobilePanelContextValue {
  activePanel: MobilePanelName | null;
  open: (name: MobilePanelName) => void;
  close: () => void;
  toggle: (name: MobilePanelName) => void;
  isOpen: (name: MobilePanelName) => boolean;
}

const NOOP = () => {};
const FALSE = () => false;

const DEFAULT_VALUE: MobilePanelContextValue = {
  activePanel: null,
  open: NOOP,
  close: NOOP,
  toggle: NOOP,
  isOpen: FALSE,
};

const MobilePanelContext =
  createContext<MobilePanelContextValue>(DEFAULT_VALUE);

export function MobilePanelProvider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const [activePanel, setActivePanel] = useState<MobilePanelName | null>(null);

  const open = useCallback((name: MobilePanelName) => {
    setActivePanel(name);
  }, []);

  const close = useCallback(() => {
    setActivePanel(null);
  }, []);

  const toggle = useCallback((name: MobilePanelName) => {
    setActivePanel((current) => (current === name ? null : name));
  }, []);

  const isOpen = useCallback(
    (name: MobilePanelName) => activePanel === name,
    [activePanel]
  );

  const value = useMemo(
    () => ({ activePanel, open, close, toggle, isOpen }),
    [activePanel, open, close, toggle, isOpen]
  );

  return (
    <MobilePanelContext.Provider value={value}>
      {children}
    </MobilePanelContext.Provider>
  );
}

export function useMobilePanelContext(): MobilePanelContextValue {
  return useContext(MobilePanelContext);
}

/**
 * Scoped helper for a specific named panel. Keeps call sites readable:
 *   const map = useMobilePanel("map");
 *   map.toggle();  map.isOpen;
 */
export function useMobilePanel(name: MobilePanelName): {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
} {
  const ctx = useMobilePanelContext();
  return useMemo(
    () => ({
      isOpen: ctx.activePanel === name,
      open: () => ctx.open(name),
      close: () => ctx.close(),
      toggle: () => ctx.toggle(name),
    }),
    [ctx, name]
  );
}
