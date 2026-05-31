"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";

const STORAGE_KEY = "mapSelection.productIds";

function readSessionProductIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is string => typeof x === "string" && x.length > 0
    );
  } catch {
    return [];
  }
}

function writeSessionProductIds(productIds: string[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(productIds));
}

export type UseMapSelectionState = {
  productIds: string[];
  isHydrated: boolean;
  addProduct: (productId: string) => void;
  removeProduct: (productId: string) => void;
  toggleProduct: (productId: string) => void;
  clear: () => void;
  isSelected: (productId: string) => boolean;

  // sync state
  isSyncing: boolean;
  syncError: string | null;
};

const MapSelectionContext = createContext<UseMapSelectionState | undefined>(
  undefined
);
MapSelectionContext.displayName = "MapSelectionContext";

export interface MapSelectionProviderProps {
  children: ReactNode;
}

/**
 * Map selection store (single shared instance).
 * - Anonymous: sessionStorage only
 * - Signed-in USER: auto-syncs to DB via /api/v1/map-selection
 *
 * Mount once at the app root (see AuthAwareMapSelectionProvider).
 */
export function MapSelectionProvider({
  children,
}: MapSelectionProviderProps): React.ReactElement {
  const { user, isAuthenticated } = useAuth();

  // Start empty on both server and client to avoid hydration mismatch;
  // a useEffect below hydrates from sessionStorage on mount.
  const [productIds, setProductIds] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const isDbBacked = isAuthenticated && user?.role === "USER";

  // Avoid firing PUT on initial DB load
  const didHydrateFromDb = useRef(false);

  // Hydrate from sessionStorage on mount (client-only). Components that need
  // to gate rendering on this can read `isHydrated`.
  useEffect(() => {
    setProductIds(readSessionProductIds());
    setIsHydrated(true);
  }, []);

  // Initial DB hydrate (merge rule = UNION)
  useEffect(() => {
    if (!isDbBacked) {
      didHydrateFromDb.current = false;
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        setIsSyncing(true);
        setSyncError(null);

        const res = await apiClient.get<{ productIds: string[] }>(
          "/map-selection"
        );

        if (!res.success) {
          throw new Error(res.error.message);
        }

        const dbProductIds = res.data?.productIds ?? [];
        const sessionProductIds = readSessionProductIds();

        // Merge (DB ∪ session), preserve order: DB first then new session items
        const merged = Array.from(
          new Set([...dbProductIds, ...sessionProductIds])
        );

        if (!cancelled) {
          setProductIds(merged);
          writeSessionProductIds(merged);
          didHydrateFromDb.current = true;
        }

        // If session had extra items, immediately push merged up to DB (immediate sync)
        if (merged.length !== dbProductIds.length) {
          const putRes = await apiClient.put<{ productIds: string[] }>(
            "/map-selection",
            {
              productIds: merged,
            }
          );
          if (!putRes.success) throw new Error(putRes.error.message);
        }
      } catch (e) {
        if (!cancelled) {
          setSyncError(
            e instanceof Error ? e.message : "Failed to sync map selection"
          );
        }
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [isDbBacked]);

  // Persist to sessionStorage on change (after hydration)
  useEffect(() => {
    if (isHydrated) writeSessionProductIds(productIds);
  }, [productIds, isHydrated]);

  // Debounced DB sync for signed-in users
  const syncTimerRef = useRef<number | null>(null);
  const pendingSyncRef = useRef<string[] | null>(null);

  // Cleanup timers when switching auth state / unmount
  useEffect(() => {
    if (!isDbBacked && syncTimerRef.current) {
      window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
      pendingSyncRef.current = null;
    }

    return () => {
      if (syncTimerRef.current) {
        window.clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      pendingSyncRef.current = null;
    };
  }, [isDbBacked]);

  const scheduleDbSync = useCallback(
    (next: string[]) => {
      if (!isDbBacked) return;
      if (!didHydrateFromDb.current) return;

      pendingSyncRef.current = next;

      if (syncTimerRef.current) {
        window.clearTimeout(syncTimerRef.current);
      }

      syncTimerRef.current = window.setTimeout(async () => {
        const payload = pendingSyncRef.current;
        pendingSyncRef.current = null;
        if (!payload) return;

        try {
          setIsSyncing(true);
          setSyncError(null);
          const res = await apiClient.put<{ productIds: string[] }>(
            "/map-selection",
            {
              productIds: payload,
            }
          );
          if (!res.success) throw new Error(res.error.message);
        } catch (e) {
          setSyncError(
            e instanceof Error ? e.message : "Failed to sync map selection"
          );
        } finally {
          setIsSyncing(false);
        }
      }, 200);
    },
    [isDbBacked]
  );

  const update = useCallback(
    (updater: (prev: string[]) => string[]) => {
      setProductIds((prev) => {
        const next = updater(prev);
        scheduleDbSync(next);
        return next;
      });
    },
    [scheduleDbSync]
  );

  const addProduct = useCallback(
    (productId: string) => {
      if (!productId) return;
      update((prev) =>
        prev.includes(productId) ? prev : [...prev, productId]
      );
    },
    [update]
  );

  const removeProduct = useCallback(
    (productId: string) => {
      if (!productId) return;
      update((prev) => prev.filter((id) => id !== productId));
    },
    [update]
  );

  const toggleProduct = useCallback(
    (productId: string) => {
      if (!productId) return;
      update((prev) =>
        prev.includes(productId)
          ? prev.filter((id) => id !== productId)
          : [...prev, productId]
      );
    },
    [update]
  );

  const clear = useCallback(() => {
    update(() => []);
  }, [update]);

  const isSelected = useCallback(
    (productId: string) => productIds.includes(productId),
    [productIds]
  );

  const contextValue = useMemo<UseMapSelectionState>(
    () => ({
      productIds,
      isHydrated,
      addProduct,
      removeProduct,
      toggleProduct,
      clear,
      isSelected,
      isSyncing,
      syncError,
    }),
    [
      productIds,
      isHydrated,
      addProduct,
      removeProduct,
      toggleProduct,
      clear,
      isSelected,
      isSyncing,
      syncError,
    ]
  );

  return (
    <MapSelectionContext.Provider value={contextValue}>
      {children}
    </MapSelectionContext.Provider>
  );
}

export function useMapSelection(): UseMapSelectionState {
  const context = useContext(MapSelectionContext);

  if (!context) {
    throw new Error(
      "useMapSelection must be used within a MapSelectionProvider"
    );
  }

  return context;
}

/**
 * Map selection provider that auto-mounts under AuthProvider.
 * Mirrors AuthAwareCartProvider so a single mount in the root layout
 * gives every component (Header, product cards, sheets) one shared store.
 */
export function AuthAwareMapSelectionProvider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return <MapSelectionProvider>{children}</MapSelectionProvider>;
}
