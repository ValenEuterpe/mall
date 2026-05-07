"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiClient } from "@/lib/api-client";
import { usePagination } from "./use-pagination";

// ============================================================================
// Types
// ============================================================================

export interface ShopContact {
  id: string;
  type: string;
  value: string;
  label: string | null;
}

export interface ShopSeller {
  id: string;
  businessName: string | null;
  logoUrl: string | null;
  isVerified: boolean;
}

export interface ShopListItem {
  id: string;
  fullCode: string;
  shopName: string | null;
  description: string | null;
  imageUrl: string | null;
  venue: string;
  building: string | null;
  floor: string | null;
  svgId: string | null;
  openingHours: Record<string, string> | null;
  contacts: ShopContact[];
  seller: ShopSeller | null;
  productCount: number;
}

export interface ShopFilters {
  search?: string;
  venue?: string;
  building?: string;
  floor?: string;
}

export type ShopSortField = "shopName" | "fullCode" | "createdAt" | "venue" | "building" | "floor";

export interface ShopSorting {
  field: ShopSortField;
  order: "asc" | "desc";
}

export interface UseShopsOptions extends ShopFilters {
  initialPage?: number;
  initialLimit?: number;
  sort?: ShopSorting;
  enabled?: boolean;
}

interface ShopsState {
  shops: ShopListItem[];
  total: number;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  lastFetchedAt: number | null;
}

export interface UseShopsReturn {
  shops: ShopListItem[];
  total: number;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  hasData: boolean;
  pagination: ReturnType<typeof usePagination>;
  refetch: () => Promise<void>;
  reset: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_LIMIT = 20;

// ============================================================================
// Utilities
// ============================================================================

function buildQueryParams(
  page: number,
  limit: number,
  filters: ShopFilters,
  sort?: ShopSorting
): Record<string, string> {
  const params: Record<string, string> = {
    page: page.toString(),
    limit: limit.toString(),
  };

  if (filters.search?.trim()) params.q = filters.search.trim();
  if (filters.venue) params.venue = filters.venue;
  if (filters.building) params.building = filters.building;
  if (filters.floor) params.floor = filters.floor;

  if (sort) {
    params.sortBy = sort.field;
    params.sortOrder = sort.order;
  }

  return params;
}

function createFiltersKey(filters: ShopFilters, sort?: ShopSorting): string {
  return JSON.stringify({ filters, sort });
}

// ============================================================================
// useShops
// ============================================================================

export function useShops(options: UseShopsOptions = {}): UseShopsReturn {
  const {
    initialPage = 1,
    initialLimit = DEFAULT_LIMIT,
    sort,
    enabled = true,
    ...filters
  } = options;

  const [state, setState] = useState<ShopsState>({
    shops: [],
    total: 0,
    isLoading: true,
    isRefetching: false,
    error: null,
    lastFetchedAt: null,
  });

  const pagination = usePagination({ initialPage, initialLimit });

  const abortControllerRef = useRef<AbortController | null>(null);
  const filtersKeyRef = useRef<string>("");
  const isMountedRef = useRef(true);

  const filtersKey = useMemo(
    () => createFiltersKey(filters, sort),
    [filters.search, filters.venue, filters.building, filters.floor, sort?.field, sort?.order]
  );

  const stableFilters = useMemo(() => filters, [filtersKey]);
  const stableSort = useMemo(() => sort, [sort?.field, sort?.order]);

  useEffect(() => {
    if (filtersKeyRef.current && filtersKeyRef.current !== filtersKey) {
      pagination.goToPage(1);
    }
    filtersKeyRef.current = filtersKey;
  }, [filtersKey]);

  const fetchShops = useCallback(
    async (isRefetch = false): Promise<void> => {
      if (!enabled) return;

      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      setState((prev) => ({
        ...prev,
        isLoading: !isRefetch && prev.shops.length === 0,
        isRefetching: isRefetch || prev.shops.length > 0,
        error: null,
      }));

      try {
        const params = buildQueryParams(pagination.page, pagination.limit, stableFilters, stableSort);

        const response = await apiClient.get<ShopListItem[]>("/public/shops", params, {
          signal: abortControllerRef.current.signal,
          showErrorToast: false,
        });

        if (!isMountedRef.current) return;

        if (response.success) {
          setState({
            shops: response.data,
            total: response.meta?.total ?? response.data.length,
            isLoading: false,
            isRefetching: false,
            error: null,
            lastFetchedAt: Date.now(),
          });
        } else {
          throw new Error(response.error.message || "Failed to fetch shops");
        }
      } catch (error) {
        if (!isMountedRef.current) return;
        if (error instanceof Error && error.name === "AbortError") return;

        setState((prev) => ({
          ...prev,
          isLoading: false,
          isRefetching: false,
          error: error instanceof Error ? error : new Error("Unknown error"),
        }));
      }
    },
    [enabled, pagination.page, pagination.limit, stableFilters, stableSort]
  );

  useEffect(() => {
    isMountedRef.current = true;
    void fetchShops();

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, [fetchShops]);

  const refetch = useCallback(async (): Promise<void> => {
    await fetchShops(true);
  }, [fetchShops]);

  const reset = useCallback((): void => {
    setState({
      shops: [],
      total: 0,
      isLoading: true,
      isRefetching: false,
      error: null,
      lastFetchedAt: null,
    });
    pagination.goToPage(1);
  }, [pagination]);

  return {
    shops: state.shops,
    total: state.total,
    isLoading: state.isLoading,
    isRefetching: state.isRefetching,
    error: state.error,
    hasData: state.lastFetchedAt !== null,
    pagination,
    refetch,
    reset,
  };
}
