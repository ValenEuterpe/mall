"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiClient } from "@/lib/api-client";
import { usePagination } from "./use-pagination";

// ============================================================================
// Types
// ============================================================================

// NOTE: These types reflect the current `/api/v1/products` response payloads
// produced by `transformProductForList` and `transformProductForDetail`.

export type SortField =
  | "createdAt"
  | "updatedAt"
  | "name"
  | "basePrice"
  | "stockQuantity"
  | "viewCount";

export type SortOrder = "asc" | "desc";

export interface ProductCategoryRef {
  id: string;
  key: string;
  name: {
    en: string;
    ru: string;
  };
}

export interface ProductShopRef {
  id: string;
  code: string;
  name: string | null;
  businessName?: string;
}

export interface ProductListItem {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  effectivePrice: number;
  stockQuantity: number;
  inStock: boolean;
  images: string[];
  brand: string | null;
  sku: string | null;
  isFeatured: boolean;
  hasDiscount: boolean;
  discount:
    | {
        type: string;
        value: unknown;
      }
    | null;
  shop: ProductShopRef;
  category: ProductCategoryRef | null;
  subcategory: ProductCategoryRef | null;
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  subcategoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  shopId?: string;
  brand?: string;
  isFeatured?: boolean;
}

export interface ProductSorting {
  field: SortField;
  order: SortOrder;
}

export interface UseProductsOptions extends ProductFilters {
  initialPage?: number;
  initialLimit?: number;
  sort?: ProductSorting;
  enabled?: boolean;
}

interface ProductsState {
  products: ProductListItem[];
  total: number;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  lastFetchedAt: number | null;
}

interface UseProductsReturn {
  products: ProductListItem[];
  total: number;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  hasData: boolean;
  pagination: ReturnType<typeof usePagination>;
  refetch: () => Promise<void>;
  reset: () => void;
}

export interface UseProductOptions {
  enabled?: boolean;
  onSuccess?: (product: ProductDetail) => void;
  onError?: (error: Error) => void;
}

export interface ProductDetail {
  id: string;
  name: string;
  description: string | null;
  pricing: {
    basePrice: number;
    effectivePrice: number;
    currency: string;
    hasDiscount: boolean;
    discountInfo:
      | {
          type: string;
          value: unknown;
          validFrom: string | null;
          validUntil: string | null;
        }
      | null;
    tiers: Array<{
      minQuantity: number;
      maxQuantity: number | null;
      price: number;
    }>;
  };
  inventory: {
    stockQuantity: number;
    inStock: boolean;
    barcode: string | null;
  };
  images: string[];
  brand: string | null;
  shop: {
    id: string;
    code: string;
    name: string | null;
    location: {
      floor: string | null;
      building: string | null;
      venue: string | null;
      svgId: string | null;
    };
    seller:
      | {
          id: string;
          businessName: string | null;
          phone: string | null;
          socialLinks: Record<string, unknown> | null;
          logoUrl: string | null;
          description: string | null;
        }
      | null;
    contacts: Array<{ type: string; value: string; label: string | null }>;
    openingHours: Record<string, unknown> | null;
  };
  category: ProductCategoryRef | null;
  subcategory: ProductCategoryRef | null;
  meta: {
    isFeatured: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

interface ProductState {
  product: ProductDetail | null;
  isLoading: boolean;
  error: Error | null;
}

interface UseProductReturn {
  product: ProductDetail | null;
  isLoading: boolean;
  error: Error | null;
  exists: boolean;
  refetch: () => Promise<void>;
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
  filters: ProductFilters,
  sort?: ProductSorting
): Record<string, string> {
  const params: Record<string, string> = {
    page: page.toString(),
    limit: limit.toString(),
  };

  if (filters.search?.trim()) params.q = filters.search.trim();
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (filters.subcategoryId) params.subcategoryId = filters.subcategoryId;
  if (filters.minPrice !== undefined && filters.minPrice >= 0) params.minPrice = String(filters.minPrice);
  if (filters.maxPrice !== undefined && filters.maxPrice >= 0) params.maxPrice = String(filters.maxPrice);
  if (filters.inStock !== undefined) params.inStock = String(filters.inStock);
  if (filters.shopId) params.shopId = filters.shopId;
  if (filters.isFeatured !== undefined) params.isFeatured = String(filters.isFeatured);
  if (filters.brand?.trim()) params.brand = filters.brand.trim();

  if (sort) {
    params.sortBy = sort.field;
    params.sortOrder = sort.order;
  }

  return params;
}

function createFiltersKey(filters: ProductFilters, sort?: ProductSorting): string {
  return JSON.stringify({ filters, sort });
}

// ============================================================================
// useProducts
// ============================================================================

export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
  const {
    initialPage = 1,
    initialLimit = DEFAULT_LIMIT,
    sort,
    enabled = true,
    ...filters
  } = options;

  const [state, setState] = useState<ProductsState>({
    products: [],
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
    [
      filters.search,
      filters.categoryId,
      filters.subcategoryId,
      filters.minPrice,
      filters.maxPrice,
      filters.inStock,
      filters.shopId,
      filters.brand,
      filters.isFeatured,
      sort?.field,
      sort?.order,
    ]
  );

  // Stabilize filters reference to prevent infinite re-render loops
  const stableFilters = useMemo(() => filters, [filtersKey]);
  const stableSort = useMemo(() => sort, [sort?.field, sort?.order]);

  useEffect(() => {
    if (filtersKeyRef.current && filtersKeyRef.current !== filtersKey) {
      pagination.goToPage(1);
    }
    filtersKeyRef.current = filtersKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  const fetchProducts = useCallback(
    async (isRefetch = false): Promise<void> => {
      if (!enabled) return;

      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      setState((prev) => ({
        ...prev,
        isLoading: !isRefetch && prev.products.length === 0,
        isRefetching: isRefetch || prev.products.length > 0,
        error: null,
      }));

      try {
        const params = buildQueryParams(pagination.page, pagination.limit, stableFilters, stableSort);

        // baseUrl is already `/api/v1`, so we call `"/products"`
        const response = await apiClient.get<ProductListItem[]>("/products", params, {
          signal: abortControllerRef.current.signal,
          showErrorToast: false,
        });

        if (!isMountedRef.current) return;

        if (response.success) {
          setState({
            products: response.data,
            total: response.meta?.total ?? response.data.length,
            isLoading: false,
            isRefetching: false,
            error: null,
            lastFetchedAt: Date.now(),
          });
        } else {
          throw new Error(response.error.message || "Failed to fetch products");
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
    void fetchProducts();

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, [fetchProducts]);

  const refetch = useCallback(async (): Promise<void> => {
    await fetchProducts(true);
  }, [fetchProducts]);

  const reset = useCallback((): void => {
    setState({
      products: [],
      total: 0,
      isLoading: true,
      isRefetching: false,
      error: null,
      lastFetchedAt: null,
    });
    pagination.goToPage(1);
  }, [pagination]);

  return {
    products: state.products,
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

// ============================================================================
// useProduct
// ============================================================================

export function useProduct(
  id: string | null | undefined,
  options: UseProductOptions = {}
): UseProductReturn {
  const { enabled = true, onSuccess, onError } = options;

  const [state, setState] = useState<ProductState>({
    product: null,
    isLoading: Boolean(id && enabled),
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  const fetchProduct = useCallback(async (): Promise<void> => {
    if (!id || !enabled) {
      setState({ product: null, isLoading: false, error: null });
      return;
    }

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiClient.get<ProductDetail>(`/products/${id}`, undefined, {
        signal: abortControllerRef.current.signal,
        showErrorToast: false,
      });

      if (!isMountedRef.current) return;

      if (response.success) {
        setState({ product: response.data, isLoading: false, error: null });
        onSuccessRef.current?.(response.data);
      } else {
        throw new Error(response.error.message || "Product not found");
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      if (error instanceof Error && error.name === "AbortError") return;

      const err = error instanceof Error ? error : new Error("Unknown error");

      setState({ product: null, isLoading: false, error: err });
      onErrorRef.current?.(err);
    }
  }, [id, enabled]);

  useEffect(() => {
    isMountedRef.current = true;
    void fetchProduct();

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, [fetchProduct]);

  const refetch = useCallback(async (): Promise<void> => {
    await fetchProduct();
  }, [fetchProduct]);

  return {
    product: state.product,
    isLoading: state.isLoading,
    error: state.error,
    exists: state.product !== null,
    refetch,
  };
}

// ============================================================================
// Selector hooks
// ============================================================================

export function useProductFromList(
  products: ProductListItem[],
  productId: string | null | undefined
): ProductListItem | null {
  return useMemo(() => {
    if (!productId) return null;
    return products.find((p) => p.id === productId) ?? null;
  }, [products, productId]);
}

export function useFilteredProducts(
  products: ProductListItem[],
  filters: Partial<ProductFilters>
): ProductListItem[] {
  return useMemo(() => {
    let filtered = [...products];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower) ||
          p.brand?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.categoryId) {
      filtered = filtered.filter((p) => p.category?.id === filters.categoryId);
    }

    if (filters.minPrice !== undefined) {
      filtered = filtered.filter((p) => p.effectivePrice >= filters.minPrice!);
    }

    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.effectivePrice <= filters.maxPrice!);
    }

    if (filters.inStock) {
      filtered = filtered.filter((p) => p.inStock);
    }

    if (filters.isFeatured !== undefined) {
      filtered = filtered.filter((p) => p.isFeatured === filters.isFeatured);
    }

    return filtered;
  }, [products, filters]);
}
