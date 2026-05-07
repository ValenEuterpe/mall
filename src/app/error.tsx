"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[Route Error]", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Page Error</CardTitle>
          <CardDescription>Something went wrong loading this page.</CardDescription>
        </CardHeader>

        <CardContent>
          {error.digest && (
            <p className="mb-4 text-center text-xs text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}

          {process.env.NODE_ENV === "development" && (
            <div className="rounded-md bg-muted p-3">
              <pre className="max-h-24 overflow-auto text-xs text-destructive">
                {error.message}
              </pre>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <div className="flex w-full gap-2">
            <Button onClick={reset} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button variant="outline" onClick={() => router.back()} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
          <Button variant="ghost" onClick={() => router.push("/")} className="w-full">
            <Home className="mr-2 h-4 w-4" />
            Return Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
