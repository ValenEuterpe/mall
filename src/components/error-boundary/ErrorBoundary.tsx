"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  RefreshCw,
  Home,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback component */
  fallback?: ReactNode | ((props: FallbackProps) => ReactNode);
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Called when the user clicks retry */
  onRetry?: () => void;
  /** Called when the error is reset */
  onReset?: () => void;
  /** Whether to show the error details in production */
  showDetailsInProduction?: boolean;
  /** Custom error message */
  message?: string;
  /** Custom description */
  description?: string;
  /** Variant of the error display */
  variant?: "full" | "inline" | "minimal" | "card";
  /** Enable automatic retry */
  autoRetry?: boolean;
  /** Number of auto retries before giving up */
  maxAutoRetries?: number;
  /** Delay between auto retries in ms */
  autoRetryDelay?: number;
  /** Component name for error context */
  componentName?: string;
  /** Support email for reporting */
  supportEmail?: string;
  /** Optional report function (Sentry/LogRocket/etc). Called when error is caught. */
  report?: (report: ErrorReport) => void | Promise<void>;
}

export interface FallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  errorId: string;
  resetError: () => void;
  retryRender: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
  isRetrying: boolean;
  showDetails: boolean;
  copied: boolean;
}

function generateErrorId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ERR-${timestamp}-${random}`.toUpperCase();
}

export interface ErrorReport {
  errorId: string;
  message: string;
  stack?: string;
  componentStack?: string;
  componentName?: string;
  url: string;
  userAgent: string;
  timestamp: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private autoRetryTimeout: ReturnType<typeof setTimeout> | null = null;

  static defaultProps: Partial<ErrorBoundaryProps> = {
    variant: "card",
    showDetailsInProduction: false,
    autoRetry: false,
    maxAutoRetries: 3,
    autoRetryDelay: 1000,
    message: "Something went wrong",
    description: "We're sorry, but an unexpected error occurred. Please try again.",
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
      retryCount: 0,
      isRetrying: false,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: generateErrorId(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    const report: ErrorReport = {
      errorId: this.state.errorId || generateErrorId(),
      message: error.message,
      stack: error.stack,
      // React typings may allow null here, so normalize for our report type.
      componentStack: (errorInfo as unknown as { componentStack?: string | null }).componentStack ?? undefined,
      // Use nullish coalescing so even if a caller passes `null`, we emit `undefined`.
      componentName: (this.props.componentName ?? undefined) as string | undefined,
      url: typeof window !== "undefined" ? window.location.href : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      timestamp: new Date().toISOString(),
    };

    void this.props.report?.(report);

    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[ErrorBoundary]", report, error);
    }

    this.props.onError?.(error, errorInfo);

    if (
      this.props.autoRetry &&
      this.state.retryCount < (this.props.maxAutoRetries ?? 3)
    ) {
      this.scheduleAutoRetry();
    }
  }

  componentWillUnmount(): void {
    if (this.autoRetryTimeout) clearTimeout(this.autoRetryTimeout);
  }

  private scheduleAutoRetry = (): void => {
    this.setState({ isRetrying: true });

    this.autoRetryTimeout = setTimeout(() => {
      this.retryRender();
    }, this.props.autoRetryDelay);
  };

  private resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
      retryCount: 0,
      isRetrying: false,
    });

    this.props.onReset?.();
  };

  private retryRender = (): void => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      isRetrying: false,
    }));

    this.props.onRetry?.();
  };

  private toggleDetails = (): void => {
    this.setState((prevState) => ({ showDetails: !prevState.showDetails }));
  };

  private copyErrorDetails = async (): Promise<void> => {
    const { error, errorInfo, errorId } = this.state;

    const details = `
Error ID: ${errorId}
Message: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
URL: ${typeof window !== "undefined" ? window.location.href : ""}
Time: ${new Date().toISOString()}
    `.trim();

    try {
      await navigator.clipboard.writeText(details);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      // eslint-disable-next-line no-console
      console.log(details);
    }
  };

  private renderFallback(): ReactNode {
    const {
      error,
      errorInfo,
      errorId,
      showDetails,
      copied,
      isRetrying,
      retryCount,
    } = this.state;

    const {
      fallback,
      message,
      description,
      variant,
      showDetailsInProduction,
      maxAutoRetries,
      supportEmail,
    } = this.props;

    const fallbackProps: FallbackProps = {
      error: error!,
      errorInfo,
      errorId,
      resetError: this.resetError,
      retryRender: this.retryRender,
    };

    if (fallback) {
      return typeof fallback === "function" ? fallback(fallbackProps) : fallback;
    }

    const isDev = process.env.NODE_ENV === "development";
    const canShowDetails = isDev || Boolean(showDetailsInProduction);
    const hasExhaustedRetries = retryCount >= (maxAutoRetries ?? 3);

    switch (variant) {
      case "minimal":
        return (
          <div className="flex items-center gap-2 p-4 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{message}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={this.retryRender}
              disabled={isRetrying}
              aria-label="Retry"
            >
              <RefreshCw className={cn("h-3 w-3", isRetrying && "animate-spin")} />
            </Button>
          </div>
        );

      case "inline":
        return (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
              <div className="flex-1 space-y-2">
                <p className="font-medium text-destructive">{message}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={this.retryRender}
                    disabled={isRetrying}
                  >
                    <RefreshCw className={cn("mr-2 h-4 w-4", isRetrying && "animate-spin")} />
                    Retry
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case "full":
        return (
          <div className="flex min-h-screen items-center justify-center bg-background p-4">
            {this.renderErrorCard(
              error,
              errorInfo,
              errorId,
              showDetails,
              copied,
              isRetrying,
              hasExhaustedRetries,
              canShowDetails,
              message,
              description,
              supportEmail
            )}
          </div>
        );

      case "card":
      default:
        return (
          <div className="flex items-center justify-center p-4">
            {this.renderErrorCard(
              error,
              errorInfo,
              errorId,
              showDetails,
              copied,
              isRetrying,
              hasExhaustedRetries,
              canShowDetails,
              message,
              description,
              supportEmail
            )}
          </div>
        );
    }
  }

  private renderErrorCard(
    error: Error | null,
    errorInfo: ErrorInfo | null,
    errorId: string,
    showDetails: boolean,
    copied: boolean,
    isRetrying: boolean,
    hasExhaustedRetries: boolean,
    canShowDetails: boolean,
    message?: string,
    description?: string,
    supportEmail?: string
  ): ReactNode {
    return (
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-lg">{message}</CardTitle>
              <p className="text-xs text-muted-foreground">Error ID: {errorId}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <CardDescription className="text-sm">{description}</CardDescription>

          {isRetrying && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Retrying automatically...</span>
            </div>
          )}

          {hasExhaustedRetries && (
            <div className="rounded-md bg-yellow-50 p-3 dark:bg-yellow-950">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Automatic retry attempts exhausted. Please try manually or contact support.
              </p>
            </div>
          )}

          {canShowDetails && error && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showDetails ? "Hide" : "Show"} technical details
              </button>

              {showDetails && (
                <div className="space-y-2">
                  <div className="relative">
                    <pre className="max-h-48 overflow-auto rounded-md bg-muted p-4 font-mono text-xs">
                      <code>{error.message}</code>
                      {error.stack && (
                        <>
                          {"\n\n"}
                          <code className="text-muted-foreground">{error.stack}</code>
                        </>
                      )}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-2"
                      onClick={this.copyErrorDetails}
                      aria-label="Copy error details"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>

                  {errorInfo?.componentStack && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Component Stack
                      </summary>
                      <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-muted p-2 font-mono">
                        {errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <div className="flex w-full gap-2">
            <Button onClick={this.retryRender} disabled={isRetrying} className="flex-1">
              <RefreshCw className={cn("mr-2 h-4 w-4", isRetrying && "animate-spin")} />
              Try Again
            </Button>
            <Button onClick={() => (window.location.href = "/")} variant="outline" className="flex-1">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </div>

          <div className="flex w-full gap-2">
            <Button onClick={() => window.location.reload()} variant="ghost" size="sm" className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Page
            </Button>

            {supportEmail && (
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() =>
                  (window.location.href = `mailto:${supportEmail}?subject=Error Report: ${errorId}&body=Error ID: ${errorId}%0A%0APlease describe what you were doing when this error occurred:%0A%0A`)
                }
              >
                <Mail className="mr-2 h-4 w-4" />
                Contact Support
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    );
  }

  render(): ReactNode {
    if (this.state.hasError) return this.renderFallback();
    return this.props.children;
  }
}

export interface ErrorBoundaryWrapperProps extends ErrorBoundaryProps {
  /** Key to force remount on change */
  resetKey?: string | number;
}

export function ErrorBoundaryWrapper({ resetKey, ...props }: ErrorBoundaryWrapperProps): ReactNode {
  return <ErrorBoundary key={resetKey} {...props} />;
}

export default ErrorBoundary;
