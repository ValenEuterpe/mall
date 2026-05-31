"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ApiResponse, RequestConfig } from "./client";
import { apiClient, ApiClientError } from "./client";

interface UseApiState<T> {
  data: T | null;
  error: ApiClientError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

interface UseApiOptions<T> extends Omit<
  RequestConfig,
  "signal" | "params" | "body" | "method"
> {
  immediate?: boolean;
  initialData?: T | null;
  cacheKey?: string;
  cacheTime?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: ApiClientError) => void;
  onSettled?: () => void;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: () => Promise<T | null>;
  reset: () => void;
  abort: () => void;
}

interface UseMutationOptions<TData, TVariables> extends Omit<
  RequestConfig,
  "signal" | "body" | "params" | "method"
> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: ApiClientError, variables: TVariables) => void;
  onSettled?: (
    data: TData | null,
    error: ApiClientError | null,
    variables: TVariables
  ) => void;
}

interface UseMutationReturn<TData, TVariables> {
  data: TData | null;
  error: ApiClientError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  mutate: (variables: TVariables) => Promise<TData | null>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  reset: () => void;
}

// Simple in-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>();

function getCached<T>(key: string, cacheTime: number): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cacheTime) {
    return cached.data as T;
  }
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function useApi<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined | null>,
  options: UseApiOptions<T> = {}
): UseApiReturn<T> {
  const {
    immediate = false,
    initialData = null,
    cacheKey,
    cacheTime = 0,
    onSuccess,
    onError,
    onSettled,
    ...requestConfig
  } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: initialData,
    error: null,
    isLoading: immediate,
    isSuccess: false,
    isError: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Stable key for params to avoid excessive rerenders
  const paramsKey = useMemo(() => JSON.stringify(params ?? {}), [params]);

  const execute = useCallback(async (): Promise<T | null> => {
    if (cacheKey && cacheTime > 0) {
      const cached = getCached<T>(cacheKey, cacheTime);
      if (cached) {
        setState({
          data: cached,
          error: null,
          isLoading: false,
          isSuccess: true,
          isError: false,
        });
        onSuccess?.(cached);
        onSettled?.();
        return cached;
      }
    }

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiClient.get<T>(endpoint, params, {
        ...requestConfig,
        signal: abortControllerRef.current.signal,
      });

      if (!response.success) {
        throw new ApiClientError(response.error.message, {
          code: response.error.code,
          status: response.error.status ?? 0,
          details: response.error.details,
        });
      }

      const data = response.data;

      if (cacheKey) {
        setCache(cacheKey, data);
      }

      setState({
        data,
        error: null,
        isLoading: false,
        isSuccess: true,
        isError: false,
      });

      onSuccess?.(data);
      onSettled?.();

      return data;
    } catch (error) {
      const apiError = error as ApiClientError;
      if (apiError.isAborted) return null;

      setState({
        data: null,
        error: apiError,
        isLoading: false,
        isSuccess: false,
        isError: true,
      });

      onError?.(apiError);
      onSettled?.();

      return null;
    }
  }, [
    endpoint,
    paramsKey,
    cacheKey,
    cacheTime,
    onSuccess,
    onError,
    onSettled,
    requestConfig,
  ]);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setState({
      data: initialData,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });
  }, [initialData]);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    setState((prev) => ({ ...prev, isLoading: false }));
  }, []);

  useEffect(() => {
    if (immediate) {
      void execute();
    }

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [immediate, execute]);

  return { ...state, execute, reset, abort };
}

export function useMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options: UseMutationOptions<TData, TVariables> = {}
): UseMutationReturn<TData, TVariables> {
  const { onSuccess, onError, onSettled } = options;

  const [state, setState] = useState<{
    data: TData | null;
    error: ApiClientError | null;
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
  }>({
    data: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  });

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await mutationFn(variables);

        if (!response.success) {
          throw new ApiClientError(response.error.message, {
            code: response.error.code,
            status: response.error.status ?? 0,
            details: response.error.details,
          });
        }

        const data = response.data;

        setState({
          data,
          error: null,
          isLoading: false,
          isSuccess: true,
          isError: false,
        });

        onSuccess?.(data, variables);
        onSettled?.(data, null, variables);

        return data;
      } catch (error) {
        const apiError = error as ApiClientError;

        setState({
          data: null,
          error: apiError,
          isLoading: false,
          isSuccess: false,
          isError: true,
        });

        onError?.(apiError, variables);
        onSettled?.(null, apiError, variables);

        throw apiError;
      }
    },
    [mutationFn, onSuccess, onError, onSettled]
  );

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData | null> => {
      try {
        return await mutateAsync(variables);
      } catch {
        return null;
      }
    },
    [mutateAsync]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });
  }, []);

  return { ...state, mutate, mutateAsync, reset };
}
