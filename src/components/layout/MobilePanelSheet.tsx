"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useMobilePanel,
  type MobilePanelName,
} from "@/contexts/mobile-panel-context";

/**
 * Bottom-anchored mobile panel that fills the viewport below the site header.
 *
 * Visual contract:
 * - Header (h-16) stays visible; panel covers everything below with a thin
 *   margin so the user always sees where they are.
 * - Tapping the backdrop or the close button dismisses the panel. Pressing
 *   the originating header button again also dismisses it (handled by the
 *   shared mobile panel context).
 *
 * Reuse contract:
 * - Pass a unique `name` (must match the name used by whatever toggles it).
 * - Children fill the remaining space; pass content that scrolls internally
 *   when needed.
 * - `title` is optional — omit when the panel content has its own header.
 */
export interface MobilePanelSheetProps {
  name: MobilePanelName;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Hide the default close button; useful when the children render their own. */
  hideClose?: boolean;
}

const HEADER_OFFSET = "4rem";
const TOP_GAP = "0.25rem";

export function MobilePanelSheet({
  name,
  title,
  children,
  className,
  hideClose = false,
}: MobilePanelSheetProps): React.ReactElement | null {
  const panel = useMobilePanel(name);

  React.useEffect(() => {
    if (!panel.isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [panel.isOpen]);

  React.useEffect(() => {
    if (!panel.isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") panel.close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  if (!panel.isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40"
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : name}
    >
      <button
        type="button"
        aria-label="Close panel"
        onClick={panel.close}
        className="bg-background/40 absolute inset-0 backdrop-blur-sm"
        style={{ top: HEADER_OFFSET }}
      />
      <div
        className={cn(
          "bg-background absolute right-0 left-0 flex flex-col rounded-t-lg border shadow-xl",
          "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom",
          className
        )}
        data-state="open"
        style={{
          top: `calc(${HEADER_OFFSET} + ${TOP_GAP})`,
          bottom: 0,
        }}
      >
        {(title || !hideClose) && (
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="text-sm font-semibold">{title}</div>
            {!hideClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={panel.close}
                aria-label="Close"
                className="-mr-2"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
