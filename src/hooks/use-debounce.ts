"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================================
// Types
// ============================================================================

export interface DebounceOptions {
  /** Delay in milliseconds */
  delay?: number;
  /** Execute immediately on first call */
  leading?: boolean;
  /** Execute on trailing edge (default: true) */
  trailing?: boolean;
  /** Maximum time to wait before forcing execution */
  maxWait?: number;
}

export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  /** Cancel pending execution */
  cancel: () => void;
  /** Execute immediately */
  flush: () => void;
  /** Check if there's a pending execution */
  isPending: () => boolean;
}

// ============================================================================
// useDebounce - Debounce a value
// ============================================================================

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// useDebouncedCallback - Debounce a callback
// ============================================================================

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  options: DebounceOptions = {}
): DebouncedFunction<T> {
  const { delay = 500, leading = false, trailing = true, maxWait } = options;

  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxWaitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastArgsRef = useRef<Parameters<T> | null>(null);
  const leadingCalledRef = useRef(false);

  // Update callback ref on each render
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (maxWaitTimeoutRef.current) {
      clearTimeout(maxWaitTimeoutRef.current);
      maxWaitTimeoutRef.current = null;
    }

    lastArgsRef.current = null;
    leadingCalledRef.current = false;
  }, []);

  const flush = useCallback(() => {
    if (lastArgsRef.current) {
      callbackRef.current(...lastArgsRef.current);
      cancel();
    }
  }, [cancel]);

  const isPending = useCallback(() => timeoutRef.current !== null, []);

  useEffect(() => cancel, [cancel]);

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      lastArgsRef.current = args;

      // Leading edge
      if (leading && !leadingCalledRef.current) {
        leadingCalledRef.current = true;
        callbackRef.current(...args);
        return;
      }

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Trailing edge
      if (trailing) {
        timeoutRef.current = setTimeout(() => {
          if (lastArgsRef.current) {
            callbackRef.current(...lastArgsRef.current);
          }
          cancel();
        }, delay);
      }

      // maxWait
      if (maxWait && !maxWaitTimeoutRef.current) {
        maxWaitTimeoutRef.current = setTimeout(() => {
          if (lastArgsRef.current) {
            callbackRef.current(...lastArgsRef.current);
          }
          cancel();
        }, maxWait);
      }
    },
    [cancel, delay, leading, maxWait, trailing]
  ) as DebouncedFunction<T>;

  debouncedFn.cancel = cancel;
  debouncedFn.flush = flush;
  debouncedFn.isPending = isPending;

  return debouncedFn;
}

// ============================================================================
// useDebouncedState - State with built-in debounce
// ============================================================================

export interface DebouncedStateReturn<T> {
  value: T;
  debouncedValue: T;
  setValue: (value: T) => void;
  setValueImmediate: (value: T) => void;
  isPending: boolean;
}

export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 500
): DebouncedStateReturn<T> {
  const [value, setValueInternal] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);
  const [isPending, setIsPending] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setValue = useCallback(
    (newValue: T) => {
      setValueInternal(newValue);
      setIsPending(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setDebouncedValue(newValue);
        setIsPending(false);
      }, delay);
    },
    [delay]
  );

  const setValueImmediate = useCallback((newValue: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setValueInternal(newValue);
    setDebouncedValue(newValue);
    setIsPending(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { value, debouncedValue, setValue, setValueImmediate, isPending };
}

export default useDebounce;
