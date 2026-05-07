"use client";

import { toast as sonnerToast, type ExternalToast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode, createElement } from "react";

// ============================================================================
// Types
// ============================================================================

export interface ToastOptions extends ExternalToast {
  /** Custom icon to display */
  icon?: ReactNode;
}

/**
 * High-level promise toast messages.
 *
 * Note: Sonner's `toast.promise()` supports richer shapes; we keep this wrapper simple and
 * map it onto Sonner's API.
 */
export interface PromiseToastOptions<T> {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((error: Error) => string);
}

/**
 * Options passed to `toast.promise()`.
 *
 * Sonner uses a slightly different option type than `ExternalToast`, so we keep this flexible.
 */
export type PromiseToastConfig<T> = Omit<ExternalToast, "description"> & {
  description?:
    | string
    | ReactNode
    | ((data: T) => string | ReactNode)
    | ((error: Error) => string | ReactNode);
  finally?: () => void | Promise<void>;
};

export interface ToastAction {
  label: string;
  onClick: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DURATION = 4000;
const SUCCESS_DURATION = 3000;
const ERROR_DURATION = 5000;
const WARNING_DURATION = 4500;
const INFO_DURATION = 4000;

const ICON_SIZE = 18;
const ICON_STROKE_WIDTH = 2;

// ============================================================================
// Icon Helpers
// ============================================================================

function createIcon(Icon: LucideIcon, className?: string): ReactNode {
  return createElement(Icon, {
    size: ICON_SIZE,
    strokeWidth: ICON_STROKE_WIDTH,
    className,
  });
}

// ============================================================================
// Toast Functions
// ============================================================================

function success(message: string, options?: ToastOptions): string | number {
  return sonnerToast.success(message, {
    duration: SUCCESS_DURATION,
    icon: createIcon(CheckCircle2, "text-green-600"),
    ...options,
  });
}

function error(message: string, options?: ToastOptions): string | number {
  return sonnerToast.error(message, {
    duration: ERROR_DURATION,
    icon: createIcon(XCircle, "text-red-600"),
    ...options,
  });
}

function warning(message: string, options?: ToastOptions): string | number {
  return sonnerToast.warning(message, {
    duration: WARNING_DURATION,
    icon: createIcon(AlertTriangle, "text-yellow-600"),
    ...options,
  });
}

function info(message: string, options?: ToastOptions): string | number {
  return sonnerToast.info(message, {
    duration: INFO_DURATION,
    icon: createIcon(Info, "text-blue-600"),
    ...options,
  });
}

function loading(message: string, options?: ToastOptions): string | number {
  return sonnerToast.loading(message, {
    icon: createElement(Loader2, {
      size: ICON_SIZE,
      strokeWidth: ICON_STROKE_WIDTH,
      className: "animate-spin text-muted-foreground",
    }),
    ...options,
  });
}

/**
 * Tracks a promise lifecycle using Sonner and returns a `Promise<T>`.
 *
 * Sonner's `toast.promise()` returns a toast id with an `unwrap()` helper.
 */
function promise<T>(
  promiseOrFn: Promise<T> | (() => Promise<T>),
  messages: PromiseToastOptions<T>,
  options?: PromiseToastConfig<T>
): Promise<T> {
  const toastId = sonnerToast.promise(promiseOrFn, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
    ...options,
  });

  return toastId.unwrap();
}

function action(
  message: string,
  actionConfig: ToastAction,
  options?: ToastOptions
): string | number {
  return sonnerToast(message, {
    action: {
      label: actionConfig.label,
      onClick: actionConfig.onClick,
    },
    duration: ERROR_DURATION,
    ...options,
  });
}

function custom(message: string, options?: ToastOptions): string | number {
  return sonnerToast(message, {
    duration: DEFAULT_DURATION,
    ...options,
  });
}

function dismiss(toastId?: string | number): void {
  sonnerToast.dismiss(toastId);
}

// ============================================================================
// Specialized Toast Functions
// ============================================================================

function formError(
  message: string = "Please fix the errors in the form",
  fieldErrors?: Record<string, string[]>
): string | number {
  let description: string | undefined;

  if (fieldErrors) {
    const errorMessages = Object.entries(fieldErrors)
      .flatMap(([field, errors]) => errors.map((e) => `${field}: ${e}`))
      .slice(0, 3);

    description = errorMessages.join(". ");

    if (Object.keys(fieldErrors).length > 3) {
      description += "...";
    }
  }

  return error(message, { description });
}

function apiError(
  err: unknown,
  fallbackMessage: string = "An unexpected error occurred"
): string | number {
  let message = fallbackMessage;
  let description: string | undefined;

  if (err instanceof Error) {
    message = err.message || fallbackMessage;
  } else if (typeof err === "object" && err !== null) {
    const errorObj = err as Record<string, unknown>;

    if (typeof errorObj.message === "string") {
      message = errorObj.message;
    }

    if (typeof errorObj.details === "string") {
      description = errorObj.details;
    }
  }

  return error(message, { description });
}

function networkError(
  message: string = "Network error. Please check your connection."
): string | number {
  return error(message, {
    description: "Please try again later",
    duration: ERROR_DURATION,
  });
}

function savedWithUndo(
  message: string,
  onUndo: () => void,
  options?: ToastOptions
): string | number {
  return sonnerToast.success(message, {
    duration: 5000,
    icon: createIcon(CheckCircle2, "text-green-600"),
    action: {
      label: "Undo",
      onClick: onUndo,
    },
    ...options,
  });
}

function confirmAction(
  message: string,
  onConfirm: () => void,
  options?: ToastOptions
): string | number {
  return sonnerToast(message, {
    duration: 10000,
    icon: createIcon(AlertTriangle, "text-yellow-600"),
    action: {
      label: "Confirm",
      onClick: onConfirm,
    },
    cancel: {
      label: "Cancel",
      onClick: () => {},
    },
    ...options,
  });
}

// ============================================================================
// Export
// ============================================================================

export const toast = {
  success,
  error,
  warning,
  info,
  loading,
  promise,
  action,
  custom,
  dismiss,

  formError,
  apiError,
  networkError,
  savedWithUndo,
  confirmAction,

  // Raw sonner toast for advanced usage
  raw: sonnerToast,
};

export default toast;
