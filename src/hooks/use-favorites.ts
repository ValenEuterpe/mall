"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiClient } from "@/lib/api-client";

// ============================================================================
// Types
// ============================================================================

export interface FavoriteProduct {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  stockQuantity: number;
  images: string[];
  brand: string | null;
  sku: string | null;
  status: string;
  isActive: boolean;
  shop: {
    id: string;
    code: string;
    name: string | null;
    venue: string | null;
    building: string | null;
    floor: string | null;
  };
  category: {
    id: string;
    name: Record<string, string>;
  } | null;
}

export interface FavoriteItem {
  id: string;
  productId: string;
  createdAt: string;
  product: FavoriteProduct;
}

export interface FavoritesResponse {
  favorites: FavoriteItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// ============================================================================
// Hook
// ============================================================================

interface UseFavoritesOptions {
  initialLimit?: number;
  enabled?: boolean;
}

export function useFavorites({
  initialLimit = 50,
  enabled = true,
}: UseFavoritesOptions = {}): {
  favorites: FavoriteItem[];
  productIds: Set<string>;
  isLoading: boolean;
  isRefetching: boolean;
  error: string | null;
  hasData: boolean;
  addFavorite: (productId: string) => Promise<boolean>;
  removeFavorite: (productId: string) => Promise<boolean>;
  isFavorite: (productId: string) => boolean;
  refetch: () => Promise<void>;
  reset: () => void;
} {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchFavorites = useCallback(
    async (isRefetch = false) => {
      if (!enabled) {
        setIsLoading(false);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (isRefetch) {
        setIsRefetching(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const response = await apiClient.get<FavoritesResponse>("/favorites", {
          limit: initialLimit,
        });

        if (response.success && response.data) {
          const data = response.data as FavoritesResponse;
          setFavorites(data.favorites || []);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("Failed to fetch favorites:", err);
        setError("Failed to load favorites");
      } finally {
        setIsLoading(false);
        setIsRefetching(false);
      }
    },
    [initialLimit, enabled]
  );

  const addFavorite = useCallback(
    async (productId: string): Promise<boolean> => {
      try {
        const response = await apiClient.post("/favorites", { productId });

        if (response.success) {
          await fetchFavorites(true);
          return true;
        }
        return false;
      } catch (err) {
        console.error("Failed to add favorite:", err);
        return false;
      }
    },
    [fetchFavorites]
  );

  const removeFavorite = useCallback(
    async (productId: string): Promise<boolean> => {
      const previous = favorites;
      setFavorites((prev) => prev.filter((f) => f.productId !== productId));

      try {
        const response = await apiClient.delete(`/favorites/${productId}`);

        if (!response.success) {
          setFavorites(previous);
          return false;
        }
        return true;
      } catch (err) {
        setFavorites(previous);
        console.error("Failed to remove favorite:", err);
        return false;
      }
    },
    [favorites]
  );

  const isFavorite = useCallback(
    (productId: string) => favorites.some((f) => f.productId === productId),
    [favorites]
  );

  const productIds = useMemo(
    () => new Set(favorites.map((f) => f.productId)),
    [favorites]
  );

  const refetch = useCallback(() => fetchFavorites(true), [fetchFavorites]);

  const reset = useCallback(() => {
    setFavorites([]);
    setIsLoading(true);
    setError(null);
  }, []);

  useEffect(() => {
    fetchFavorites();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchFavorites]);

  return {
    favorites,
    productIds,
    isLoading,
    isRefetching,
    error,
    hasData: favorites.length > 0,
    addFavorite,
    removeFavorite,
    isFavorite,
    refetch,
    reset,
  };
}
