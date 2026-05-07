"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================================
// Types
// ============================================================================

export interface UseLocalStorageOptions<T> {
  /** Serializer function (default: JSON.stringify) */
  serializer?: (value: StoredValue<T>) => string;
  /** Deserializer function (default: JSON.parse) */
  deserializer?: (value: string) => StoredValue<T> | T;
  /** Sync across tabs (default: true) */
  syncTabs?: boolean;
  /** Time-to-live in milliseconds */
  ttl?: number;
  /** Called when storage error occurs */
  onError?: (error: Error) => void;
}

export interface StoredValue<T> {
  value: T;
  timestamp?: number;
  expiry?: number;
}

export interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (value: T | ((prev: T) => T)) => void;
  removeValue: () => void;
  isLoading: boolean;
  error: Error | null;
}

// ============================================================================
// Constants
// ============================================================================

const IS_SERVER = typeof window === "undefined";

// ============================================================================
// Helpers
// ============================================================================

function dispatchStorageEvent(key: string, newValue: string | null): void {
  // Dispatch custom event for same-tab updates
  window.dispatchEvent(
    new StorageEvent("storage", {
      key,
      newValue,
      storageArea: localStorage,
    })
  );
}

function unwrapStoredValue<T>(
  parsed: StoredValue<T> | T,
  fallback: T
): { value: T; expiry?: number } {
  if (parsed && typeof parsed === "object" && "value" in parsed) {
    const sv = parsed as StoredValue<T>;
    return { value: sv.value, expiry: sv.expiry };
  }

  return { value: (parsed as T) ?? fallback };
}

// ============================================================================
// Hook
// ============================================================================

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions<T> = {}
): UseLocalStorageReturn<T> {
  const {
    serializer = JSON.stringify,
    deserializer = JSON.parse,
    syncTabs = true,
    ttl,
    onError,
  } = options;

  const initialValueRef = useRef(initialValue);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  const readValue = useCallback((): T => {
    if (IS_SERVER) {
      return initialValueRef.current;
    }

    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) {
        return initialValueRef.current;
      }

      const parsed = deserializer(raw);
      const { value, expiry } = unwrapStoredValue(parsed, initialValueRef.current);

      if (ttl && expiry && Date.now() > expiry) {
        window.localStorage.removeItem(key);
        return initialValueRef.current;
      }

      return value;
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Failed to read from localStorage");
      setError(e);
      onError?.(e);
      return initialValueRef.current;
    }
  }, [deserializer, key, onError, ttl]);

  useEffect(() => {
    setStoredValue(readValue());
    setIsLoading(false);
  }, [readValue]);

  const setValue = useCallback(
    (valueOrFn: T | ((prev: T) => T)) => {
      if (IS_SERVER) {
        return;
      }

      try {
        const nextValue = valueOrFn instanceof Function ? valueOrFn(storedValue) : valueOrFn;

        const toStore: StoredValue<T> = {
          value: nextValue,
          timestamp: Date.now(),
          ...(ttl ? { expiry: Date.now() + ttl } : {}),
        };

        const serialized = serializer(toStore);
        window.localStorage.setItem(key, serialized);

        setStoredValue(nextValue);
        setError(null);

        if (syncTabs) {
          dispatchStorageEvent(key, serialized);
        }
      } catch (err) {
        const e = err instanceof Error ? err : new Error("Failed to write to localStorage");
        setError(e);
        onError?.(e);
      }
    },
    [key, onError, serializer, storedValue, syncTabs, ttl]
  );

  const removeValue = useCallback(() => {
    if (IS_SERVER) {
      return;
    }

    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValueRef.current);
      setError(null);

      if (syncTabs) {
        dispatchStorageEvent(key, null);
      }
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Failed to remove from localStorage");
      setError(e);
      onError?.(e);
    }
  }, [key, onError, syncTabs]);

  useEffect(() => {
    if (IS_SERVER || !syncTabs) return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== key || event.storageArea !== localStorage) {
        return;
      }

      if (event.newValue === null) {
        setStoredValue(initialValueRef.current);
        return;
      }

      try {
        const parsed = deserializer(event.newValue);
        const { value } = unwrapStoredValue(parsed, initialValueRef.current);
        setStoredValue(value);
      } catch {
        // Ignore invalid payloads
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [deserializer, key, syncTabs]);

  return {
    value: storedValue,
    setValue,
    removeValue,
    isLoading,
    error,
  };
}

// ============================================================================
// Convenience Hooks
// ============================================================================

export function useLocalStorageToggle(
  key: string,
  defaultValue: boolean = false
): [boolean, () => void, (value: boolean | ((prev: boolean) => boolean)) => void] {
  const { value, setValue } = useLocalStorage<boolean>(key, defaultValue);

  const toggle = useCallback(() => setValue((prev) => !prev), [setValue]);

  return [value, toggle, setValue];
}

export function useLocalStorageArray<T>(
  key: string,
  initialValue: T[] = []
): {
  items: T[];
  add: (item: T) => void;
  remove: (predicate: (item: T) => boolean) => void;
  clear: () => void;
  contains: (predicate: (item: T) => boolean) => boolean;
  toggle: (item: T, predicate?: (item: T) => boolean) => void;
} {
  const { value: items, setValue: setItems, removeValue } = useLocalStorage<T[]>(
    key,
    initialValue
  );

  const add = useCallback((item: T) => setItems((prev) => [...prev, item]), [setItems]);

  const remove = useCallback(
    (predicate: (item: T) => boolean) => setItems((prev) => prev.filter((i) => !predicate(i))),
    [setItems]
  );

  const clear = useCallback(() => removeValue(), [removeValue]);

  const contains = useCallback((predicate: (item: T) => boolean) => items.some(predicate), [items]);

  const toggle = useCallback(
    (item: T, predicate?: (i: T) => boolean) => {
      const checkFn = predicate ?? ((i: T) => Object.is(i, item));
      if (contains(checkFn)) {
        remove(checkFn);
      } else {
        add(item);
      }
    },
    [add, contains, remove]
  );

  return { items, add, remove, clear, contains, toggle };
}

export default useLocalStorage;
