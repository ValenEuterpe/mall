"use client";

import type { ReactNode } from "react";

import {
  ErrorBoundary,
  type ErrorBoundaryProps,
  type FallbackProps,
} from "@/components/error-boundary/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface PageErrorBoundaryProps {
  children: ReactNode;
  pageName?: string;
  supportEmail?: string;
}

export function PageErrorBoundary({
  children,
  pageName,
  supportEmail,
}: PageErrorBoundaryProps): ReactNode {
  return (
    <ErrorBoundary
      variant="full"
      componentName={pageName}
      message="This page encountered an error"
      description="We're sorry, but this page failed to load properly. Please try refreshing or contact support if the problem persists."
      supportEmail={supportEmail}
    >
      {children}
    </ErrorBoundary>
  );
}

interface SectionErrorBoundaryProps {
  children: ReactNode;
  sectionName?: string;
  fallbackHeight?: string;
}

export function SectionErrorBoundary({
  children,
  sectionName,
  fallbackHeight = "200px",
}: SectionErrorBoundaryProps): ReactNode {
  const fallback = ({ retryRender }: FallbackProps) => (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-muted-foreground/25 bg-muted/50"
      style={{ minHeight: fallbackHeight }}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <AlertTriangle className="h-5 w-5" />
        <span>Failed to load {sectionName || "this section"}</span>
      </div>
      <Button variant="outline" size="sm" onClick={retryRender}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  );

  return (
    <ErrorBoundary variant="inline" componentName={sectionName} fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}

interface WidgetErrorBoundaryProps {
  children: ReactNode;
  widgetName?: string;
}

export function WidgetErrorBoundary({
  children,
  widgetName,
}: WidgetErrorBoundaryProps): ReactNode {
  return (
    <ErrorBoundary
      variant="minimal"
      componentName={widgetName}
      message={`${widgetName || "Widget"} unavailable`}
    >
      {children}
    </ErrorBoundary>
  );
}

interface FormErrorBoundaryProps {
  children: ReactNode;
  formName?: string;
  onReset?: () => void;
}

export function FormErrorBoundary({
  children,
  formName,
  onReset,
}: FormErrorBoundaryProps): ReactNode {
  const fallback = ({ retryRender, resetError }: FallbackProps) => (
    <div className="space-y-4 rounded-lg border border-destructive/50 bg-destructive/10 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
        <div>
          <h3 className="font-medium text-destructive">Form Error</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            An error occurred in {formName || "this form"}. Your data may not have been
            saved.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => {
            resetError();
            onReset?.();
          }}
        >
          Reset Form
        </Button>
        <Button variant="outline" size="sm" onClick={retryRender}>
          Try Again
        </Button>
      </div>
    </div>
  );

  return (
    <ErrorBoundary componentName={formName} fallback={fallback} onReset={onReset}>
      {children}
    </ErrorBoundary>
  );
}

interface AsyncErrorBoundaryProps {
  children: ReactNode;
}

export function AsyncErrorBoundary({ children }: AsyncErrorBoundaryProps): ReactNode {
  return (
    <ErrorBoundary
      variant="inline"
      autoRetry
      maxAutoRetries={2}
      autoRetryDelay={2000}
      message="Failed to load content"
      description="We're having trouble loading this content. Retrying automatically..."
    >
      {children}
    </ErrorBoundary>
  );
}

export { ErrorBoundary, type ErrorBoundaryProps, type FallbackProps };
