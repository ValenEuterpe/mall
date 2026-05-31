"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[Global Error]", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="bg-background flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader className="space-y-2 text-center">
              <div className="bg-destructive/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
                <AlertTriangle className="text-destructive h-8 w-8" />
              </div>
              <CardTitle className="text-2xl">Application Error</CardTitle>
              <CardDescription>
                We're sorry, but something went wrong with the application.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {error.digest && (
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">
                    Error Reference: {error.digest}
                  </p>
                </div>
              )}

              {process.env.NODE_ENV === "development" && (
                <div className="bg-muted rounded-md p-4">
                  <pre className="text-destructive max-h-32 overflow-auto text-xs">
                    {error.message}
                  </pre>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex justify-center gap-3">
              <Button onClick={reset} size="lg">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => (window.location.href = "/")}
              >
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      </body>
    </html>
  );
}
