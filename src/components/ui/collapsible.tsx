"use client";

import * as React from "react";

/**
 * Minimal collapsible implementation.
 *
 * The full shadcn collapsible depends on @radix-ui/react-collapsible.
 * We provide a simple controlled/uncontrolled implementation.
 */

type CollapsibleContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null);

export function Collapsible({
  open,
  defaultOpen,
  onOpenChange,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = React.useState(Boolean(defaultOpen));

  const isControlled = typeof open === "boolean";
  const currentOpen = isControlled ? (open as boolean) : internalOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  return <CollapsibleContext.Provider value={{ open: currentOpen, setOpen }}>{children}</CollapsibleContext.Provider>;
}

export function CollapsibleTrigger({
  children,
  asChild,
}: {
  children: React.ReactElement;
  asChild?: boolean;
}) {
  const ctx = React.useContext(CollapsibleContext);
  if (!ctx) throw new Error("CollapsibleTrigger must be used within Collapsible");

  type ClickableProps = { onClick?: React.MouseEventHandler };
  const childProps = children.props as ClickableProps;
  const onClick: React.MouseEventHandler = (e) => {
    childProps.onClick?.(e);
    ctx.setOpen(!ctx.open);
  };

  if (asChild) {
    return React.cloneElement(
      children as React.ReactElement<ClickableProps>,
      { onClick }
    );
  }

  return (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  );
}

export function CollapsibleContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(CollapsibleContext);
  if (!ctx) throw new Error("CollapsibleContent must be used within Collapsible");
  if (!ctx.open) return null;
  return <div className={className}>{children}</div>;
}
