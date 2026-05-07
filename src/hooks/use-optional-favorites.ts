"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";
import { useRouter } from "@/i18n/routing";

const LOCALE_PATTERN = /^\/(en|ru|am)(\/|$)/;

export function useOptionalFavorites(): {
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => void;
  isLoading: boolean;
} {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const {
    isFavorite: checkIsFavorite,
    addFavorite,
    removeFavorite,
    productIds,
    isLoading,
  } = useFavorites({ enabled: isAuthenticated });

  const isFavorite = useCallback(
    (productId: string): boolean => productIds.has(productId),
    [productIds]
  );

  const toggleFavorite = useCallback(
    (productId: string) => {
      if (!isAuthenticated) {
        const pathWithoutLocale = pathname.replace(LOCALE_PATTERN, "/");
        const callbackUrl = encodeURIComponent(pathWithoutLocale);
        router.push(`/login?callbackUrl=${callbackUrl}`);
        return;
      }

      if (productIds.has(productId)) {
        void removeFavorite(productId);
      } else {
        void addFavorite(productId);
      }
    },
    [isAuthenticated, productIds, addFavorite, removeFavorite, router, pathname]
  );

  return { isFavorite, toggleFavorite, isLoading };
}
