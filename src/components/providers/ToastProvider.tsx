"use client";

import { Toaster } from "@/components/ui/sonner";

// ============================================================================
// Types
// ============================================================================

export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface ToastProviderProps {
  /** Position of toast notifications */
  position?: ToastPosition;
  /** Whether to show rich colors based on toast type */
  richColors?: boolean;
  /** Whether to show close button */
  closeButton?: boolean;
  /** Whether toasts expand on hover */
  expand?: boolean;
  /** Default duration in milliseconds */
  duration?: number;
  /** Maximum visible toasts */
  visibleToasts?: number;
  /** Gap between toasts in pixels */
  gap?: number;
  /** Offset from viewport edges */
  offset?: string | number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DURATION = 4000;

// ============================================================================
// Component
// ============================================================================

/**
 * App-level toast provider. Add once near the root of the app (e.g. in `src/app/layout.tsx`).
 *
 * Note: relies on `next-themes` ThemeProvider being present, because the underlying shadcn `Toaster`
 * wrapper reads theme via `useTheme()`.
 */
export function ToastProvider({
  position = "top-right",
  richColors = true,
  closeButton = true,
  expand = false,
  duration = DEFAULT_DURATION,
  visibleToasts = 4,
  gap = 12,
  offset = "16px",
}: ToastProviderProps) {
  return (
    <Toaster
      position={position}
      richColors={richColors}
      closeButton={closeButton}
      expand={expand}
      duration={duration}
      visibleToasts={visibleToasts}
      gap={gap}
      offset={offset}
    />
  );
}
