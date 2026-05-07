"use client";

import * as React from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Sheet = Dialog;
export const SheetTrigger = DialogTrigger;
export const SheetClose = DialogClose;

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogContent> {
  side?: "left" | "right" | "top" | "bottom";
}

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  SheetContentProps
>(({ className, side = "right", ...props }, ref) => {
  const sideClasses: Record<NonNullable<SheetContentProps["side"]>, string> = {
    left: "left-0 top-0 h-full w-80 max-w-[85vw] translate-x-0 translate-y-0 rounded-none",
    right:
      "right-0 top-0 h-full w-80 max-w-[85vw] translate-x-0 translate-y-0 rounded-none",
    top: "top-0 left-0 w-full max-h-[85vh] translate-x-0 translate-y-0 rounded-none",
    bottom:
      "bottom-0 left-0 w-full max-h-[85vh] translate-x-0 translate-y-0 rounded-none",
  };

  return (
    <DialogContent
      ref={ref}
      className={cn(
        // Override dialog centering styles (DialogContent has fixed centering)
        // We purposely re-apply positioning for drawer-like sheet.
        "fixed z-50 grid gap-4 border bg-background p-6 shadow-lg duration-200",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        side === "left" && "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
        side === "right" &&
          "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
        side === "top" && "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        side === "bottom" &&
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        "translate-x-0 translate-y-0",
        sideClasses[side],
        className
      )}
      {...props}
    />
  );
});
SheetContent.displayName = "SheetContent";

export const SheetHeader = DialogHeader;
export const SheetTitle = DialogTitle;
export const SheetDescription = DialogDescription;
