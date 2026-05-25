"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";

import { apiClient } from "@/lib/api-client";
import { useDebounce } from "./use-debounce";

// ============================================================================
// Types
// ============================================================================

export interface ProductSearchItem {
  id: string;
  name: string;
  images: string[];
  basePrice: number;
  effectivePrice?: number;
  hasDiscount?: boolean;
  discount?: {
    type: string;
    value: number;
  } | null;
  stockQuantity: number;
  shop: {
    id: string;
    code: string;
    name: string | null;
    businessName?: string | null;
    svgId: string | null;
  };
  category?: {
    id: string;
    name_en: string;
    name_ru: string;
  };
}

export interface ProductCategory {
  id: string;
  name: string;
  icon?: string | null;
  productCount?: number;
  type?: "category" | "subcategory";
  parentId?: string;
}

export interface ProductSearchFilters {
  categoryId: string; // "all" means no filter
  priceRange: [number, number];
  maxPrice: number;
}

export interface UseProductSearchOptions {
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  initialQuery?: string;
}

export interface UseProductSearchReturn {
  // Data
  products: ProductSearchItem[];
  totalProducts: number;
  productsLoading: boolean;
  hasMore: boolean;
  page: number;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Filters
  categories: ProductCategory[];
  selectedCategory: string;
  setSelectedCategory: (id: string) => void;
  availableTags: Array<{ id: string; name: string; key: string }>;
  selectedTagIds: string[];
  setSelectedTagIds: (ids: string[]) => void;
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  maxPrice: number;
  activeFiltersCount: number;

  // Actions
  handleLoadMore: () => void;
  handleResetFilters: () => void;
}

// ============================================================================
// Hook
// ============================================================================

const DEFAULT_LIMIT = 12;
const DEFAULT_MAX_PRICE = 100000;

export function useProductSearch(
  options?: UseProductSearchOptions
): UseProductSearchReturn {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const sortBy = options?.sortBy ?? "viewCount";
  const sortOrder = options?.sortOrder ?? "desc";
  const locale = useLocale();

  // Products state
  const [products, setProducts] = useState<ProductSearchItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState(options?.initialQuery ?? "");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [availableTags, setAvailableTags] = useState<
    Array<{ id: string; name: string; key: string }>
  >([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([
    0,
    DEFAULT_MAX_PRICE,
  ]);
  const [maxPrice] = useState(DEFAULT_MAX_PRICE);

  // Load available tags when category changes
  useEffect(() => {
    async function loadTags(): Promise<void> {
      if (!selectedCategory || selectedCategory === "all") {
        setAvailableTags([]);
        return;
      }

      // If it's a subcategory, we should probably get tags for its parent category
      const cat = categories.find((c) => c.id === selectedCategory);
      const categoryId =
        cat?.type === "subcategory" ? cat.parentId : selectedCategory;

      if (!categoryId) return;

      try {
        const res = await apiClient.get<any[]>(
          `/tags?categoryId=${categoryId}`
        );
        if (res.success) {
          setAvailableTags(
            res.data.map((t: any) => ({
              id: t.id,
              key: t.key,
              name: t[`name_${locale}`] || t.name_en,
            }))
          );
        }
      } catch {
        // Silent fail
      }
    }

    void loadTags();
  }, [selectedCategory, categories, locale]);

  // Load products
  useEffect(() => {
    let cancelled = false;

    async function loadProducts(): Promise<void> {
      try {
        setProductsLoading(true);

        const params: Record<string, string | number> = {
          page,
          limit,
          sortBy,
          sortOrder,
          locale,
        };

        if (debouncedSearch) {
          params.q = debouncedSearch;
        }

        if (selectedCategory && selectedCategory !== "all") {
          const selected = categories.find((c) => c.id === selectedCategory);
          if (selected?.type === "subcategory") {
            params.subcategoryId = selectedCategory;
          } else {
            params.categoryId = selectedCategory;
          }
        }

        if (selectedTagIds.length > 0) {
          params.tagIds = selectedTagIds.join(",");
        }

        if (priceRange[0] > 0) {
          params.minPrice = priceRange[0];
        }

        if (priceRange[1] < maxPrice) {
          params.maxPrice = priceRange[1];
        }

        const res = await apiClient.get<ProductSearchItem[]>(
          "/products",
          params,
          {
            showErrorToast: false,
          }
        );

        if (!res.success) throw new Error(res.error.message);

        if (!cancelled) {
          if (page === 1) {
            setProducts(res.data);
          } else {
            setProducts((prev) => [...prev, ...res.data]);
          }
          setTotalProducts(res.meta?.total ?? res.data.length);
          setHasMore(res.meta?.hasMore ?? false);
        }
      } catch (e) {
        console.error("Failed to load products:", e);
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [
    debouncedSearch,
    selectedCategory,
    categories,
    priceRange,
    page,
    maxPrice,
    limit,
    sortBy,
    sortOrder,
    locale,
  ]);

  // Load categories
  useEffect(() => {
    async function loadCategories(): Promise<void> {
      try {
        const res = await apiClient.get<{ items: ProductCategory[] }>(
          "/categories",
          {
            flat: "true",
            includeEmpty: "true",
            locale,
          }
        );
        if (res.success) {
          setCategories(res.data.items);
        }
      } catch {
        // Silent fail for categories
      }
    }

    loadCategories();
  }, [locale]);

  // Reset page when search/filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCategory, priceRange, selectedTagIds]);

  // Load more
  const handleLoadMore = useCallback(() => {
    if (!productsLoading && hasMore) {
      setPage((p) => p + 1);
    }
  }, [productsLoading, hasMore]);

  // Reset all
  const handleResetFilters = useCallback(() => {
    setSelectedCategory("all");
    setSelectedTagIds([]);
    setPriceRange([0, maxPrice]);
    setSearchQuery("");
    setPage(1);
  }, [maxPrice]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== "all") count++;
    if (selectedTagIds.length > 0) count++;
    if (priceRange[0] > 0 || priceRange[1] < maxPrice) count++;
    return count;
  }, [selectedCategory, priceRange, maxPrice, selectedTagIds]);

  return {
    products,
    totalProducts,
    productsLoading,
    hasMore,
    page,
    searchQuery,
    setSearchQuery,
    categories,
    selectedCategory,
    setSelectedCategory,
    availableTags,
    selectedTagIds,
    setSelectedTagIds,
    priceRange,
    setPriceRange,
    maxPrice,
    activeFiltersCount,
    handleLoadMore,
    handleResetFilters,
  };
}
