"use client";

import React, { memo, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Package, RefreshCw, Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { UserProductCard, UserProductCardSkeleton } from "./UserProductCard";
import type { ProductCardData } from "@/types/product";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GridColumns = 1 | 2 | 3 | 4 | 5 | 6;

export interface ProductGridProps {
  products: ProductCardData[];
  isLoading?: boolean;
  skeletonCount?: number;
  columns?: {
    default?: GridColumns;
    sm?: GridColumns;
    md?: GridColumns;
    lg?: GridColumns;
    xl?: GridColumns;
    "2xl"?: GridColumns;
  };
  gap?: "sm" | "md" | "lg";
  animated?: boolean;
  emptyState?: {
    title?: string;
    description?: string;
    icon?: React.ReactNode;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  error?: Error | null;
  onRetry?: () => void;
  onProductClick?: (product: ProductCardData) => void;
  className?: string;
  priorityCount?: number;
}

const COLUMN_CLASSES: Record<GridColumns, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

const GAP_CLASSES = {
  sm: "gap-3",
  md: "gap-4 md:gap-6",
  lg: "gap-6 md:gap-8",
};

const DEFAULT_COLUMNS = {
  default: 1 as GridColumns,
  sm: 2 as GridColumns,
  lg: 3 as GridColumns,
  xl: 4 as GridColumns,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
};

const EmptyState = memo(function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="bg-muted mb-4 rounded-full p-4">
        {icon || <Package className="text-muted-foreground h-12 w-12" />}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm text-sm">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
});

const ErrorState = memo(function ErrorState({
  error,
  onRetry,
}: {
  error: Error;
  onRetry?: () => void;
}) {
  const t = useTranslations("common");

  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="bg-destructive/10 mb-4 rounded-full p-4">
        <Package className="text-destructive h-12 w-12" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">{t("errorTitle")}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm text-sm">
        {error.message || t("errorDescription")}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          {t("retry")}
        </Button>
      )}
    </div>
  );
});

const LoadingGrid = memo(function LoadingGrid({
  count,
  gridClassName,
}: {
  count: number;
  gridClassName: string;
}) {
  return (
    <div className={gridClassName}>
      {Array.from({ length: count }).map((_, index) => (
        <UserProductCardSkeleton key={`skeleton-${index}`} />
      ))}
    </div>
  );
});

export const ProductGrid = memo(function ProductGrid({
  products,
  isLoading = false,
  skeletonCount = 8,
  columns = DEFAULT_COLUMNS,
  gap = "md",
  animated = true,
  emptyState,
  error,
  onRetry,
  onProductClick,
  className,
  priorityCount = 4,
}: ProductGridProps) {
  const t = useTranslations("products.grid");

  const gridClassName = useMemo(() => {
    const colClasses = [
      COLUMN_CLASSES[columns.default || 1],
      columns.sm && `sm:${COLUMN_CLASSES[columns.sm]}`,
      columns.md && `md:${COLUMN_CLASSES[columns.md]}`,
      columns.lg && `lg:${COLUMN_CLASSES[columns.lg]}`,
      columns.xl && `xl:${COLUMN_CLASSES[columns.xl]}`,
      columns["2xl"] && `2xl:${COLUMN_CLASSES[columns["2xl"]]}`,
    ]
      .filter(Boolean)
      .join(" ");

    return cn("grid", colClasses, GAP_CLASSES[gap], className);
  }, [columns, gap, className]);

  const defaultEmptyState = useMemo(
    () => ({
      title: emptyState?.title || t("noProductsFound"),
      description: emptyState?.description || t("noProductsDescription"),
      icon: emptyState?.icon || (
        <Search className="text-muted-foreground h-12 w-12" />
      ),
      action: emptyState?.action,
    }),
    [emptyState, t]
  );

  const handleProductClick = useCallback(
    (product: ProductCardData) => {
      onProductClick?.(product);
    },
    [onProductClick]
  );

  if (error) return <ErrorState error={error} onRetry={onRetry} />;

  if (isLoading)
    return <LoadingGrid count={skeletonCount} gridClassName={gridClassName} />;

  if (products.length === 0) {
    return (
      <EmptyState
        title={defaultEmptyState.title}
        description={defaultEmptyState.description}
        icon={defaultEmptyState.icon}
        action={defaultEmptyState.action}
      />
    );
  }

  if (animated) {
    return (
      <motion.div
        className={gridClassName}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="popLayout">
          {products.map((product, index) => (
            <motion.div key={product.id} variants={itemVariants} layout>
              <UserProductCard
                product={product}
                priority={index < priorityCount}
                onAddToMap={() => handleProductClick(product)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <div className={gridClassName}>
      {products.map((product, index) => (
        <UserProductCard
          key={product.id}
          product={product}
          priority={index < priorityCount}
          onAddToMap={() => handleProductClick(product)}
        />
      ))}
    </div>
  );
});

export interface InfiniteProductGridProps extends ProductGridProps {
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

export const InfiniteProductGrid = memo(function InfiniteProductGrid({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  ...props
}: InfiniteProductGridProps) {
  const t = useTranslations("common");

  return (
    <div className="space-y-8">
      <ProductGrid {...props} />

      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
            className="min-w-[200px]"
          >
            {isFetchingNextPage ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {t("loading")}
              </>
            ) : (
              t("loadMore")
            )}
          </Button>
        </div>
      )}

      {isFetchingNextPage && (
        <div className={cn(props.className, "grid gap-4 md:gap-6")}>
          {Array.from({ length: 4 }).map((_, i) => (
            <UserProductCardSkeleton key={`loading-${i}`} />
          ))}
        </div>
      )}
    </div>
  );
});

export default ProductGrid;
