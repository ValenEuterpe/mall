"use client";

import { useCallback, useState } from "react";
import { toast } from "@/lib/utils/toast";

export interface ErrorState {
  error: Error | null;
  hasError: boolean;
  errorMessage: string | null;
  errorCode: string | null;
}

export interface UseErrorHandlerOptions {
  /** Show toast notification on error */
  showToast?: boolean;
  /** Custom error message */
  fallbackMessage?: string;
  /** Callback when error occurs */
  onError?: (error: Error) => void;
  /** Callback when error is cleared */
  onClear?: () => void;
}

export interface UseErrorHandlerReturn extends ErrorState {
  handleError: (error: unknown) => void;
  clearError: () => void;
  withErrorHandling: <T>(fn: () => T | Promise<T>) => Promise<T | undefined>;
  executeAsync: <T>(
    fn: () => Promise<T>,
    options?: { successMessage?: string }
  ) => Promise<T | undefined>;
  reset: () => void;
}

interface ParsedError {
  message: string;
  code: string | null;
  originalError: Error;
}

function parseError(error: unknown, fallbackMessage: string): ParsedError {
  if (error instanceof Error) {
    return {
      message: error.message || fallbackMessage,
      code: (error as { code?: string }).code ?? null,
      originalError: error,
    };
  }

  if (typeof error === "object" && error !== null) {
    const errorObj = error as Record<string, unknown>;

    if (typeof errorObj.message === "string") {
      const parsedError = new Error(errorObj.message);
      return {
        message: errorObj.message,
        code: typeof errorObj.code === "string" ? errorObj.code : null,
        originalError: parsedError,
      };
    }

    // Axios-like `{ data: { message } }`
    if (typeof errorObj.data === "object" && errorObj.data !== null) {
      const data = errorObj.data as Record<string, unknown>;
      if (typeof data.message === "string") {
        const parsedError = new Error(data.message);
        return {
          message: data.message,
          code: typeof data.code === "string" ? data.code : null,
          originalError: parsedError,
        };
      }
    }
  }

  if (typeof error === "string") {
    return { message: error, code: null, originalError: new Error(error) };
  }

  return {
    message: fallbackMessage,
    code: null,
    originalError: new Error(fallbackMessage),
  };
}

export function useErrorHandler(
  options: UseErrorHandlerOptions = {}
): UseErrorHandlerReturn {
  const {
    showToast = true,
    fallbackMessage = "An unexpected error occurred",
    onError,
    onClear,
  } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    hasError: false,
    errorMessage: null,
    errorCode: null,
  });

  const handleError = useCallback(
    (err: unknown) => {
      const parsed = parseError(err, fallbackMessage);

      setErrorState({
        error: parsed.originalError,
        hasError: true,
        errorMessage: parsed.message,
        errorCode: parsed.code,
      });

      if (showToast) {
        toast.error(parsed.message);
      }

      onError?.(parsed.originalError);

      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.error("[useErrorHandler]", parsed.originalError);
      }
    },
    [fallbackMessage, onError, showToast]
  );

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      hasError: false,
      errorMessage: null,
      errorCode: null,
    });
    onClear?.();
  }, [onClear]);

  const reset = useCallback(() => {
    clearError();
  }, [clearError]);

  const withErrorHandling = useCallback(
    async <T>(fn: () => T | Promise<T>): Promise<T | undefined> => {
      try {
        clearError();
        return await fn();
      } catch (e) {
        handleError(e);
        return undefined;
      }
    },
    [clearError, handleError]
  );

  const executeAsync = useCallback(
    async <T>(
      fn: () => Promise<T>,
      execOptions?: { successMessage?: string }
    ): Promise<T | undefined> => {
      try {
        clearError();
        const result = await fn();

        if (execOptions?.successMessage) {
          toast.success(execOptions.successMessage);
        }

        return result;
      } catch (e) {
        handleError(e);
        return undefined;
      }
    },
    [clearError, handleError]
  );

  return {
    ...errorState,
    handleError,
    clearError,
    withErrorHandling,
    executeAsync,
    reset,
  };
}

export default useErrorHandler;
