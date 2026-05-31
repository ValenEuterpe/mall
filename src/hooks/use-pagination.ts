"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// ============================================================================
// Types
// ============================================================================

export interface UsePaginationOptions {
  /** Initial page number (default: 1) */
  initialPage?: number;
  /** Items per page (default: 20) */
  initialLimit?: number;
  /** Total number of items */
  total?: number;
  /** Sync with URL query params */
  syncWithUrl?: boolean;
  /** URL param names */
  paramNames?: {
    page?: string;
    limit?: string;
  };
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
  /** Callback when limit changes */
  onLimitChange?: (limit: number) => void;
  /** Available limit options */
  limitOptions?: number[];
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  offset: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isFirstPage: boolean;
  isLastPage: boolean;
  startItem: number;
  endItem: number;
  pageNumbers: (number | "ellipsis")[];
}

export interface UsePaginationReturn extends PaginationState {
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setTotal: (total: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  goToPage: (page: number) => void;
  reset: () => void;
  isCurrentPage: (page: number) => boolean;
  getRangeText: () => string;
  paginationParams: { page: number; limit: number; offset: number };
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_LIMIT_OPTIONS = [10, 20, 50, 100];
const MAX_VISIBLE_PAGES = 7;

// ============================================================================
// Helpers
// ============================================================================

function generatePageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number = MAX_VISIBLE_PAGES
): (number | "ellipsis")[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [];
  const sidePages = Math.floor((maxVisible - 3) / 2);

  pages.push(1);

  let startPage = Math.max(2, currentPage - sidePages);
  let endPage = Math.min(totalPages - 1, currentPage + sidePages);

  if (currentPage <= sidePages + 2) {
    endPage = Math.min(totalPages - 1, maxVisible - 2);
  }

  if (currentPage >= totalPages - sidePages - 1) {
    startPage = Math.max(2, totalPages - maxVisible + 3);
  }

  if (startPage > 2) {
    pages.push("ellipsis");
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  if (endPage < totalPages - 1) {
    pages.push("ellipsis");
  }

  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

// ============================================================================
// Hook
// ============================================================================

export function usePagination(
  options: UsePaginationOptions = {}
): UsePaginationReturn {
  const {
    initialPage = 1,
    initialLimit = 20,
    total: initialTotal = 0,
    syncWithUrl = false,
    paramNames = { page: "page", limit: "limit" },
    onPageChange,
    onLimitChange,
    limitOptions = DEFAULT_LIMIT_OPTIONS,
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const getInitialPage = (): number => {
    if (syncWithUrl) {
      const urlPage = searchParams.get(paramNames.page || "page");
      if (urlPage) {
        const parsed = parseInt(urlPage, 10);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }
    return initialPage;
  };

  const getInitialLimit = (): number => {
    if (syncWithUrl) {
      const urlLimit = searchParams.get(paramNames.limit || "limit");
      if (urlLimit) {
        const parsed = parseInt(urlLimit, 10);
        if (!isNaN(parsed) && limitOptions.includes(parsed)) {
          return parsed;
        }
      }
    }
    return initialLimit;
  };

  const [page, setPageInternal] = useState<number>(getInitialPage);
  const [limit, setLimitInternal] = useState<number>(getInitialLimit);
  const [total, setTotal] = useState<number>(initialTotal);

  const updateUrl = useCallback(
    (newPage: number, newLimit: number) => {
      if (!syncWithUrl) return;

      const params = new URLSearchParams(searchParams.toString());

      if (newPage === 1) {
        params.delete(paramNames.page || "page");
      } else {
        params.set(paramNames.page || "page", newPage.toString());
      }

      if (newLimit === initialLimit) {
        params.delete(paramNames.limit || "limit");
      } else {
        params.set(paramNames.limit || "limit", newLimit.toString());
      }

      const query = params.toString();
      router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [syncWithUrl, searchParams, paramNames, pathname, router, initialLimit]
  );

  const computed = useMemo<
    Omit<PaginationState, "page" | "limit" | "total">
  >(() => {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const offset = (safePage - 1) * limit;

    const startItem = total === 0 ? 0 : offset + 1;
    const endItem = Math.min(offset + limit, total);

    return {
      totalPages,
      offset,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
      isFirstPage: safePage === 1,
      isLastPage: safePage === totalPages,
      startItem,
      endItem,
      pageNumbers: generatePageNumbers(safePage, totalPages),
    };
  }, [page, limit, total]);

  useEffect(() => {
    if (page > computed.totalPages && computed.totalPages > 0) {
      setPageInternal(computed.totalPages);
    }
  }, [computed.totalPages, page]);

  const setPage = useCallback(
    (newPage: number) => {
      const validPage = Math.min(
        Math.max(1, newPage),
        computed.totalPages || 1
      );
      setPageInternal(validPage);
      updateUrl(validPage, limit);
      onPageChange?.(validPage);
    },
    [computed.totalPages, limit, updateUrl, onPageChange]
  );

  const setLimit = useCallback(
    (newLimit: number) => {
      if (!limitOptions.includes(newLimit)) return;

      setLimitInternal(newLimit);
      setPageInternal(1);
      updateUrl(1, newLimit);
      onLimitChange?.(newLimit);
    },
    [limitOptions, updateUrl, onLimitChange]
  );

  const nextPage = useCallback(() => {
    if (computed.hasNextPage) {
      setPage(page + 1);
    }
  }, [computed.hasNextPage, page, setPage]);

  const prevPage = useCallback(() => {
    if (computed.hasPreviousPage) {
      setPage(page - 1);
    }
  }, [computed.hasPreviousPage, page, setPage]);

  const firstPage = useCallback(() => setPage(1), [setPage]);

  const lastPage = useCallback(
    () => setPage(computed.totalPages),
    [computed.totalPages, setPage]
  );

  const goToPage = useCallback(
    (targetPage: number) => setPage(targetPage),
    [setPage]
  );

  const reset = useCallback(() => {
    setPageInternal(initialPage);
    setLimitInternal(initialLimit);
    updateUrl(initialPage, initialLimit);
  }, [initialPage, initialLimit, updateUrl]);

  const isCurrentPage = useCallback(
    (targetPage: number) => page === targetPage,
    [page]
  );

  const getRangeText = useCallback((): string => {
    if (total === 0) return "No items";
    return `${computed.startItem}-${computed.endItem} of ${total}`;
  }, [total, computed.startItem, computed.endItem]);

  const paginationParams = useMemo(
    () => ({
      page,
      limit,
      offset: computed.offset,
    }),
    [page, limit, computed.offset]
  );

  return {
    page,
    limit,
    total,
    ...computed,
    setPage,
    setLimit,
    setTotal,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    goToPage,
    reset,
    isCurrentPage,
    getRangeText,
    paginationParams,
  };
}

export default usePagination;
