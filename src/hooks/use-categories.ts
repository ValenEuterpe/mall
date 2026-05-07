"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";

import { apiClient } from "@/lib/api-client";

// ============================================================================
// Types (aligned with `/api/v1/categories` handler)
// ============================================================================

export interface Subcategory {
  id: string;
  key: string;
  name: string;
  productCount: number;
  parentId?: string;
}

export interface Category {
  id: string;
  key: string;
  name: string;
  icon: string | null;
  productCount: number;
  subcategories: Subcategory[];
}

interface CategoriesState {
  categories: Category[];
  isLoading: boolean;
  error: Error | null;
  lastFetchedAt: number | null;
}

interface UseCategoriesOptions {
  enabled?: boolean;
  staleTime?: number;
  /** Map to API: includeEmpty=true */
  includeEmpty?: boolean;
  /** Map to API: flat=true (NOTE: changes response shape) */
  flat?: boolean;
}

interface UseCategoriesReturn {
  categories: Category[];
  isLoading: boolean;
  error: Error | null;
  hasData: boolean;
  refetch: () => Promise<void>;
  getCategoryById: (id: string) => Category | undefined;
  getCategoryByKey: (key: string) => Category | undefined;
  getSubcategoryById: (id: string) => Subcategory | undefined;
  allSubcategories: Subcategory[];
}

const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes

const categoriesCache = new Map<
  string,
  {
    data: Category[];
    fetchedAt: number;
  }
>();

type CategoriesApiResponse =
  | { categories: Category[]; total: number; locale: string }
  | { items: Array<{ id: string; key: string; name: string; type: "category" | "subcategory"; parentKey?: string }>; total: number };

export function useCategories(options: UseCategoriesOptions = {}): UseCategoriesReturn {
  const {
    enabled = true,
    staleTime = DEFAULT_STALE_TIME,
    includeEmpty = false,
    flat = false,
  } = options;

  const locale = useLocale();

  const cacheKey = useMemo(
    () => `${locale}-includeEmpty:${includeEmpty}-flat:${flat}`,
    [locale, includeEmpty, flat]
  );

  const [state, setState] = useState<CategoriesState>(() => {
    const cached = categoriesCache.get(cacheKey);

    if (cached && Date.now() - cached.fetchedAt < staleTime) {
      return {
        categories: cached.data,
        isLoading: false,
        error: null,
        lastFetchedAt: cached.fetchedAt,
      };
    }

    return {
      categories: [],
      isLoading: enabled,
      error: null,
      lastFetchedAt: null,
    };
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const fetchCategories = useCallback(
    async (force = false): Promise<void> => {
      if (!enabled) return;

      if (!force) {
        const cached = categoriesCache.get(cacheKey);
        if (cached && Date.now() - cached.fetchedAt < staleTime) {
          if (isMountedRef.current) {
            setState({
              categories: cached.data,
              isLoading: false,
              error: null,
              lastFetchedAt: cached.fetchedAt,
            });
          }
          return;
        }
      }

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setState((prev) => ({
        ...prev,
        isLoading: prev.categories.length === 0,
        error: null,
      }));

      try {
        const params: Record<string, string> = {
          // IMPORTANT: backend currently supports only "en" | "ru".
          // If locale is "am", we still pass it, but server will fall back to default.
          locale: String(locale),
          includeEmpty: includeEmpty ? "true" : "false",
          flat: flat ? "true" : "false",
        };

        const response = await apiClient.get<CategoriesApiResponse>("/categories", params, {
          signal: abortControllerRef.current.signal,
          showErrorToast: false,
        });

        if (!isMountedRef.current) return;

        if (response.success) {
          if ("categories" in response.data) {
            const categories = response.data.categories;
            const now = Date.now();

            categoriesCache.set(cacheKey, {
              data: categories,
              fetchedAt: now,
            });

            setState({ categories, isLoading: false, error: null, lastFetchedAt: now });
          } else {
            // flat response - not supported by these hooks (it loses the tree)
            throw new Error("Categories API returned flat response; set flat=false to use useCategories().");
          }
        } else {
          throw new Error(response.error.message || "Failed to fetch categories");
        }
      } catch (error) {
        if (!isMountedRef.current) return;
        if (error instanceof Error && error.name === "AbortError") return;

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error : new Error("Unknown error"),
        }));
      }
    },
    [enabled, cacheKey, staleTime, locale, includeEmpty, flat]
  );

  useEffect(() => {
    isMountedRef.current = true;
    void fetchCategories();

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, [fetchCategories]);

  const refetch = useCallback(async (): Promise<void> => {
    await fetchCategories(true);
  }, [fetchCategories]);

  const getCategoryById = useCallback(
    (id: string): Category | undefined => state.categories.find((c) => c.id === id),
    [state.categories]
  );

  const getCategoryByKey = useCallback(
    (key: string): Category | undefined => state.categories.find((c) => c.key === key),
    [state.categories]
  );

  const getSubcategoryById = useCallback(
    (id: string): Subcategory | undefined => {
      for (const category of state.categories) {
        const found = category.subcategories.find((s) => s.id === id);
        if (found) return found;
      }
      return undefined;
    },
    [state.categories]
  );

  const allSubcategories = useMemo((): Subcategory[] => {
    return state.categories.flatMap((cat) =>
      cat.subcategories.map((sub) => ({
        ...sub,
        parentId: cat.id,
      }))
    );
  }, [state.categories]);

  return {
    categories: state.categories,
    isLoading: state.isLoading,
    error: state.error,
    hasData: state.lastFetchedAt !== null,
    refetch,
    getCategoryById,
    getCategoryByKey,
    getSubcategoryById,
    allSubcategories,
  };
}

// ============================================================================
// Convenience hooks
// ============================================================================

export function useCategory(
  idOrKey: string | null | undefined,
  options: { enabled?: boolean } = {}
): {
  category: Category | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const { enabled = true } = options;

  const { categories, isLoading, error, getCategoryById, getCategoryByKey } = useCategories({
    enabled: enabled && Boolean(idOrKey),
  });

  const category = useMemo(() => {
    if (!idOrKey) return undefined;
    return getCategoryById(idOrKey) || getCategoryByKey(idOrKey);
  }, [idOrKey, getCategoryById, getCategoryByKey]);

  return { category, isLoading, error };
}

interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
  level: number;
  path: string[];
}

export function useCategoryTree(): {
  tree: CategoryTreeNode[];
  flattenedTree: CategoryTreeNode[];
  isLoading: boolean;
} {
  const { categories, isLoading } = useCategories();

  const tree = useMemo((): CategoryTreeNode[] => {
    return categories.map((category) => ({
      ...category,
      children: category.subcategories.map((sub) => ({
        ...sub,
        icon: null,
        subcategories: [],
        children: [],
        level: 1,
        path: [category.key, sub.key],
      })) as unknown as CategoryTreeNode[],
      level: 0,
      path: [category.key],
    }));
  }, [categories]);

  const flattenedTree = useMemo((): CategoryTreeNode[] => {
    const result: CategoryTreeNode[] = [];

    function flatten(nodes: CategoryTreeNode[]): void {
      for (const node of nodes) {
        result.push(node);
        if (node.children.length > 0) flatten(node.children);
      }
    }

    flatten(tree);
    return result;
  }, [tree]);

  return { tree, flattenedTree, isLoading };
}

// ============================================================================
// Cache management
// ============================================================================

export function clearCategoriesCache(): void {
  categoriesCache.clear();
}

export async function prefetchCategories(locale: string): Promise<void> {
  const cacheKey = `${locale}-includeEmpty:false-flat:false`;

  try {
    const response = await apiClient.get<CategoriesApiResponse>("/categories", { locale });

    if (response.success && "categories" in response.data) {
      categoriesCache.set(cacheKey, {
        data: response.data.categories,
        fetchedAt: Date.now(),
      });
    }
  } catch {
    // swallow
  }
}
