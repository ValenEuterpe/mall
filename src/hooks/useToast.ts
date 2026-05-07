"use client";

import { useCallback, useMemo } from "react";
import {
  toast,
  type ToastOptions,
  type PromiseToastOptions,
  type PromiseToastConfig,
  type ToastAction,
} from "@/lib/utils/toast";

export interface UseToastReturn {
  success: (message: string, options?: ToastOptions) => string | number;
  error: (message: string, options?: ToastOptions) => string | number;
  warning: (message: string, options?: ToastOptions) => string | number;
  info: (message: string, options?: ToastOptions) => string | number;
  loading: (message: string, options?: ToastOptions) => string | number;
  promise: <T>(
    promiseOrFn: Promise<T> | (() => Promise<T>),
    messages: PromiseToastOptions<T>,
    options?: PromiseToastConfig<T>
  ) => Promise<T>;
  action: (
    message: string,
    actionConfig: ToastAction,
    options?: ToastOptions
  ) => string | number;
  dismiss: (toastId?: string | number) => void;
  formError: (
    message?: string,
    fieldErrors?: Record<string, string[]>
  ) => string | number;
  apiError: (err: unknown, fallbackMessage?: string) => string | number;
  networkError: (message?: string) => string | number;
  savedWithUndo: (
    message: string,
    onUndo: () => void,
    options?: ToastOptions
  ) => string | number;
  confirmAction: (
    message: string,
    onConfirm: () => void,
    options?: ToastOptions
  ) => string | number;
}

export function useToast(): UseToastReturn {
  const success = useCallback(
    (message: string, options?: ToastOptions) => toast.success(message, options),
    []
  );

  const error = useCallback(
    (message: string, options?: ToastOptions) => toast.error(message, options),
    []
  );

  const warning = useCallback(
    (message: string, options?: ToastOptions) => toast.warning(message, options),
    []
  );

  const info = useCallback(
    (message: string, options?: ToastOptions) => toast.info(message, options),
    []
  );

  const loading = useCallback(
    (message: string, options?: ToastOptions) => toast.loading(message, options),
    []
  );

  const promise = useCallback(
    <T>(
      promiseOrFn: Promise<T> | (() => Promise<T>),
      messages: PromiseToastOptions<T>,
      options?: PromiseToastConfig<T>
    ) => toast.promise(promiseOrFn, messages, options),
    []
  );

  const action = useCallback(
    (message: string, actionConfig: ToastAction, options?: ToastOptions) =>
      toast.action(message, actionConfig, options),
    []
  );

  const dismiss = useCallback((toastId?: string | number) => {
    toast.dismiss(toastId);
  }, []);

  const formError = useCallback(
    (message?: string, fieldErrors?: Record<string, string[]>) =>
      toast.formError(message, fieldErrors),
    []
  );

  const apiError = useCallback(
    (err: unknown, fallbackMessage?: string) =>
      toast.apiError(err, fallbackMessage),
    []
  );

  const networkError = useCallback(
    (message?: string) => toast.networkError(message),
    []
  );

  const savedWithUndo = useCallback(
    (message: string, onUndo: () => void, options?: ToastOptions) =>
      toast.savedWithUndo(message, onUndo, options),
    []
  );

  const confirmAction = useCallback(
    (message: string, onConfirm: () => void, options?: ToastOptions) =>
      toast.confirmAction(message, onConfirm, options),
    []
  );

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      success,
      error,
      warning,
      info,
      loading,
      promise,
      action,
      dismiss,
      formError,
      apiError,
      networkError,
      savedWithUndo,
      confirmAction,
    }),
    [
      success,
      error,
      warning,
      info,
      loading,
      promise,
      action,
      dismiss,
      formError,
      apiError,
      networkError,
      savedWithUndo,
      confirmAction,
    ]
  );
}

export default useToast;
