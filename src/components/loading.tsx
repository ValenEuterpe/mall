import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";

interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: SpinnerSize;
  /** Additional CSS classes */
  className?: string;
  /** Accessible label */
  label?: string;
  /** Use Lucide icon instead of CSS spinner */
  variant?: "css" | "icon";
}

interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  loading?: boolean;
  /** Content to overlay */
  children?: ReactNode;
  /** Overlay opacity */
  opacity?: "light" | "medium" | "heavy";
  /** Blur the background */
  blur?: boolean;
  /** Loading message */
  message?: string;
  /** Spinner size */
  spinnerSize?: SpinnerSize;
}

interface SkeletonTextProps {
  /** Number of lines */
  lines?: number;
  /** Width of the last line */
  lastLineWidth?: "full" | "3/4" | "1/2" | "1/4";
  /** Gap between lines */
  gap?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SPINNER_SIZES: Record<SpinnerSize, string> = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

const SPINNER_BORDER_SIZES: Record<SpinnerSize, string> = {
  xs: "border",
  sm: "border-2",
  md: "border-2",
  lg: "border-[3px]",
  xl: "border-4",
};

// ============================================================================
// Base Components
// ============================================================================

/**
 * Animated loading spinner.
 *
 * @example
 * ```tsx
 * <LoadingSpinner size="lg" />
 * <LoadingSpinner variant="icon" label="Loading products..." />
 * ```
 */
export function LoadingSpinner({
  size = "md",
  className,
  label = "Loading...",
  variant = "css",
}: LoadingSpinnerProps) {
  if (variant === "icon") {
    return (
      <div
        className={cn("flex items-center justify-center", className)}
        role="status"
        aria-label={label}
      >
        <Loader2
          className={cn("text-primary animate-spin", SPINNER_SIZES[size])}
        />
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center justify-center", className)}
      role="status"
      aria-label={label}
    >
      <div
        className={cn(
          "border-primary animate-spin rounded-full border-t-transparent",
          SPINNER_SIZES[size],
          SPINNER_BORDER_SIZES[size]
        )}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * Loading dots animation.
 */
export function LoadingDots({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="status"
      aria-label="Loading..."
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-primary h-2 w-2 animate-bounce rounded-full"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Skeleton text lines.
 */
export function SkeletonText({
  lines = 3,
  lastLineWidth = "3/4",
  gap = "md",
  className,
}: SkeletonTextProps) {
  const gapClass = {
    sm: "space-y-1",
    md: "space-y-2",
    lg: "space-y-3",
  };

  const lastWidthClass = {
    full: "w-full",
    "3/4": "w-3/4",
    "1/2": "w-1/2",
    "1/4": "w-1/4",
  };

  return (
    <div className={cn(gapClass[gap], className)}>
      {[...Array(lines)].map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 ? lastWidthClass[lastLineWidth] : "w-full"
          )}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Page & Layout Loading
// ============================================================================

/**
 * Full page loading spinner.
 */
export function LoadingPage({ message }: { message?: string }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4"
      role="status"
      aria-label={message || "Loading page..."}
    >
      <LoadingSpinner size="xl" variant="icon" />
      {message && (
        <p className="text-muted-foreground animate-pulse text-sm">{message}</p>
      )}
    </div>
  );
}

/**
 * Section loading state.
 */
export function LoadingSection({
  height = "200px",
  message,
}: {
  height?: string;
  message?: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3"
      style={{ minHeight: height }}
      role="status"
      aria-label={message || "Loading..."}
    >
      <LoadingSpinner size="lg" />
      {message && <p className="text-muted-foreground text-sm">{message}</p>}
    </div>
  );
}

/**
 * Inline loading indicator.
 */
export function LoadingInline({
  message = "Loading...",
  size = "sm",
}: {
  message?: string;
  size?: SpinnerSize;
}) {
  return (
    <div className="flex items-center gap-2">
      <LoadingSpinner size={size} variant="icon" />
      <span className="text-muted-foreground text-sm">{message}</span>
    </div>
  );
}

/**
 * Loading overlay for existing content.
 */
export function LoadingOverlay({
  loading = true,
  children,
  opacity = "medium",
  blur = false,
  message,
  spinnerSize = "lg",
}: LoadingOverlayProps) {
  const opacityClass = {
    light: "bg-background/50",
    medium: "bg-background/70",
    heavy: "bg-background/90",
  };

  return (
    <div className="relative">
      {children}
      {loading && (
        <div
          className={cn(
            "absolute inset-0 z-50 flex flex-col items-center justify-center gap-3",
            opacityClass[opacity],
            blur && "backdrop-blur-sm"
          )}
          role="status"
          aria-label={message || "Loading..."}
        >
          <LoadingSpinner size={spinnerSize} />
          {message && (
            <p className="text-muted-foreground text-sm">{message}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Card Loading States
// ============================================================================

/**
 * Loading skeleton for a product/item card.
 */
export function LoadingCard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <Skeleton className="h-48 w-full rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    </div>
  );
}

/**
 * Grid of loading cards.
 */
export function LoadingCardGrid({
  count = 6,
  columns = 3,
}: {
  count?: number;
  columns?: 2 | 3 | 4;
}) {
  const gridClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-6", gridClass[columns])}>
      {[...Array(count)].map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  );
}

/**
 * Loading skeleton for a stat card.
 */
export function LoadingStatCard() {
  return (
    <div className="space-y-3 rounded-lg border p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

// ============================================================================
// Table Loading States
// ============================================================================

/**
 * Loading skeleton for a table.
 */
export function LoadingTable({
  rows = 5,
  columns = 4,
  showHeader = true,
}: {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}) {
  return (
    <div className="w-full space-y-3">
      {showHeader && (
        <div className="flex gap-4 border-b pb-2">
          {[...Array(columns)].map((_, i) => (
            <Skeleton
              key={i}
              className="h-4 flex-1"
              style={{ maxWidth: i === 0 ? "30%" : undefined }}
            />
          ))}
        </div>
      )}
      {[...Array(rows)].map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4">
          {[...Array(columns)].map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className="h-10 flex-1 rounded"
              style={{ maxWidth: colIndex === 0 ? "30%" : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Loading skeleton for a data table with actions.
 */
export function LoadingDataTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <div className="rounded-lg border">
        <LoadingTable rows={rows} columns={5} />
      </div>

      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Form Loading States
// ============================================================================

/**
 * Loading skeleton for a form.
 */
export function LoadingForm({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {[...Array(fields)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex justify-end gap-3 pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

/**
 * Loading skeleton for form with sections.
 */
export function LoadingFormSections({ sections = 2 }: { sections?: number }) {
  return (
    <div className="space-y-8">
      {[...Array(sections)].map((_, i) => (
        <div key={i} className="space-y-4">
          <div className="space-y-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// List Loading States
// ============================================================================

/**
 * Loading skeleton for a list item.
 */
export function LoadingListItem() {
  return (
    <div className="flex items-center gap-4 p-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

/**
 * Loading skeleton for a list.
 */
export function LoadingList({
  count = 5,
  divided = true,
}: {
  count?: number;
  divided?: boolean;
}) {
  return (
    <div className={cn(divided && "divide-y")}>
      {[...Array(count)].map((_, i) => (
        <LoadingListItem key={i} />
      ))}
    </div>
  );
}

// ============================================================================
// Specific Component Loading States
// ============================================================================

/**
 * Loading skeleton for user profile header.
 */
export function LoadingProfile() {
  return (
    <div className="flex items-start gap-6">
      <Skeleton className="h-24 w-24 rounded-full" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-4 pt-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <Skeleton className="h-10 w-28" />
    </div>
  );
}

/**
 * Loading skeleton for sidebar navigation.
 */
export function LoadingSidebar() {
  return (
    <div className="space-y-6 p-4">
      <Skeleton className="h-8 w-32" />
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
      <div className="space-y-2 border-t pt-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

/**
 * Loading skeleton for dashboard stats row.
 */
export function LoadingStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(count)].map((_, i) => (
        <LoadingStatCard key={i} />
      ))}
    </div>
  );
}

/**
 * Loading skeleton for a chart.
 */
export function LoadingChart({ height = "300px" }: { height?: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="w-full rounded-lg" style={{ height }} />
    </div>
  );
}

/**
 * Loading skeleton for product details page.
 */
export function LoadingProductDetail() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <Skeleton className="aspect-square w-full rounded-lg" />
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-20 rounded" />
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>

        <Skeleton className="h-10 w-32" />

        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        <div className="flex gap-3 pt-4">
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 w-12" />
        </div>

        <div className="space-y-3 pt-6">
          <Skeleton className="h-4 w-40" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for shop details.
 */
export function LoadingShopDetail() {
  return (
    <div className="space-y-8">
      <div className="flex items-start gap-6">
        <Skeleton className="h-20 w-20 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      </div>

      <LoadingStats count={4} />

      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <LoadingCardGrid count={4} columns={4} />
      </div>
    </div>
  );
}

// ============================================================================
// Button Loading State
// ============================================================================

/**
 * Loading state for buttons (use with disabled state).
 */
export function ButtonLoading({
  size = "sm",
  className,
}: {
  size?: SpinnerSize;
  className?: string;
}) {
  return (
    <Loader2 className={cn("animate-spin", SPINNER_SIZES[size], className)} />
  );
}

export default LoadingSpinner;
