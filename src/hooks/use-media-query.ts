"use client";

import { useEffect, useMemo, useState } from "react";

// ============================================================================
// Types
// ============================================================================

export interface UseMediaQueryOptions {
  /** Default value during SSR (default: false) */
  defaultValue?: boolean;
  /** Initialize in useEffect to avoid hydration mismatch (default: true) */
  ssr?: boolean;
}

export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface BreakpointConfig {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  "2xl": number;
}

// ============================================================================
// Constants
// ============================================================================

const IS_SERVER = typeof window === "undefined";

/** Default Tailwind breakpoints */
const DEFAULT_BREAKPOINTS: BreakpointConfig = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

// ============================================================================
// useMediaQuery
// ============================================================================

export function useMediaQuery(
  query: string,
  options: UseMediaQueryOptions = {}
): boolean {
  const { defaultValue = false, ssr = true } = options;

  const [matches, setMatches] = useState<boolean>(() => {
    if (IS_SERVER || ssr) {
      return defaultValue;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (IS_SERVER) return;

    const mediaQuery = window.matchMedia(query);

    // Set initial value (handles SSR hydration)
    setMatches(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    // Legacy browsers
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [query]);

  return matches;
}

// ============================================================================
// Breakpoint Hooks
// ============================================================================

export function useBreakpoint(
  breakpoints: BreakpointConfig = DEFAULT_BREAKPOINTS
): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("xs");

  useEffect(() => {
    if (IS_SERVER) return;

    const handleResize = () => {
      const width = window.innerWidth;

      if (width >= breakpoints["2xl"]) {
        setBreakpoint("2xl");
      } else if (width >= breakpoints.xl) {
        setBreakpoint("xl");
      } else if (width >= breakpoints.lg) {
        setBreakpoint("lg");
      } else if (width >= breakpoints.md) {
        setBreakpoint("md");
      } else if (width >= breakpoints.sm) {
        setBreakpoint("sm");
      } else {
        setBreakpoint("xs");
      }
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoints]);

  return breakpoint;
}

export function useBreakpointUp(
  breakpoint: Breakpoint,
  breakpoints: BreakpointConfig = DEFAULT_BREAKPOINTS
): boolean {
  return useMediaQuery(`(min-width: ${breakpoints[breakpoint]}px)`);
}

export function useBreakpointDown(
  breakpoint: Breakpoint,
  breakpoints: BreakpointConfig = DEFAULT_BREAKPOINTS
): boolean {
  return useMediaQuery(`(max-width: ${breakpoints[breakpoint] - 1}px)`);
}

export function useBreakpointBetween(
  min: Breakpoint,
  max: Breakpoint,
  breakpoints: BreakpointConfig = DEFAULT_BREAKPOINTS
): boolean {
  return useMediaQuery(
    `(min-width: ${breakpoints[min]}px) and (max-width: ${breakpoints[max] - 1}px)`
  );
}

// ============================================================================
// Convenience Hooks
// ============================================================================

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

export function useIsTablet(): boolean {
  return useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
}

export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}

export function useIsTouchDevice(): boolean {
  return useMediaQuery("(hover: none) and (pointer: coarse)");
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

export function usePrefersDarkMode(): boolean {
  return useMediaQuery("(prefers-color-scheme: dark)");
}

export function usePrefersLightMode(): boolean {
  return useMediaQuery("(prefers-color-scheme: light)");
}

export function useOrientation(): "portrait" | "landscape" {
  const isPortrait = useMediaQuery("(orientation: portrait)");
  return isPortrait ? "portrait" : "landscape";
}

export function useIsHighDPI(): boolean {
  return useMediaQuery(
    "(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)"
  );
}

// ============================================================================
// Responsive Value Hook
// ============================================================================

type ResponsiveValue<T> = Partial<Record<Breakpoint, T>> & { default: T };

export function useResponsiveValue<T>(values: ResponsiveValue<T>): T {
  const breakpoint = useBreakpoint();

  return useMemo(() => {
    const breakpointOrder: Breakpoint[] = ["2xl", "xl", "lg", "md", "sm", "xs"];
    const currentIndex = breakpointOrder.indexOf(breakpoint);

    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const bp = breakpointOrder[i];
      if (bp in values) {
        return values[bp] as T;
      }
    }

    return values.default;
  }, [breakpoint, values]);
}

export default useMediaQuery;
