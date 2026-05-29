"use client";

import * as React from "react";

/**
 * Minimal tooltip stubs.
 *
 * The full shadcn tooltip implementation depends on @radix-ui/react-tooltip,
 * which isn't currently in this repo.
 *
 * These components are no-ops that preserve the component API so higher-level
 * components can be implemented without adding new dependencies.
 */

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function TooltipTrigger({
  children,
}: {
  children: React.ReactElement;
  asChild?: boolean;
}) {
  return children;
}

export function TooltipContent({
  // Stub component — content is intentionally not rendered. Prop is on the
  // public type for source compatibility with callers.
  children: _children,
}: {
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  return null;
}
