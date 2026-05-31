"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FieldGroupProps {
  /** Group title */
  title?: string;
  /** Group description */
  description?: string;
  /** Child fields */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function FieldGroup({
  title,
  description,
  children,
  className,
}: FieldGroupProps) {
  return (
    <fieldset className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <legend className="text-lg leading-none font-semibold tracking-tight">
              {title}
            </legend>
          )}
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}

interface FieldRowProps {
  /** Child fields */
  children: ReactNode;
  /** Number of columns */
  columns?: 2 | 3 | 4;
  /** Gap between fields */
  gap?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
}

export function FieldRow({
  children,
  columns = 2,
  gap = "md",
  className,
}: FieldRowProps) {
  const columnClass = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  };

  const gapClass = {
    sm: "gap-3",
    md: "gap-4",
    lg: "gap-6",
  };

  return (
    <div
      className={cn(
        "grid grid-cols-1",
        columnClass[columns],
        gapClass[gap],
        className
      )}
    >
      {children}
    </div>
  );
}

interface FieldSectionProps {
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Child fields */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** With border/card styling */
  bordered?: boolean;
}

export function FieldSection({
  title,
  description,
  children,
  className,
  bordered = false,
}: FieldSectionProps) {
  return (
    <div
      className={cn(
        "space-y-6",
        bordered && "bg-card rounded-lg border p-6",
        className
      )}
    >
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg leading-none font-semibold tracking-tight">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

interface FormActionsProps {
  /** Child buttons */
  children: ReactNode;
  /** Alignment */
  align?: "left" | "center" | "right" | "between";
  /** Additional CSS classes */
  className?: string;
  /** Sticky footer */
  sticky?: boolean;
}

export function FormActions({
  children,
  align = "right",
  className,
  sticky = false,
}: FormActionsProps) {
  const alignClass = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
    between: "justify-between",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 pt-6",
        alignClass[align],
        sticky &&
          "bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky bottom-0 -mx-6 mt-6 border-t px-6 py-4 backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  );
}

export function FormDivider({ className }: { className?: string }) {
  return <hr className={cn("border-border", className)} />;
}
