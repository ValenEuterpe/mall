"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal scroll-area implementation.
 *
 * This repo doesn't currently include @radix-ui/react-scroll-area.
 * We provide a lightweight wrapper that matches the typical shadcn API surface
 * sufficiently for our layout components.
 */
export const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("relative overflow-auto", className)}
      {...props}
    />
  );
});
ScrollArea.displayName = "ScrollArea";
