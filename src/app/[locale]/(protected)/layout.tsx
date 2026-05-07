"use client";

import React, { useEffect, useMemo, useState, type ReactNode } from "react";

import { usePathname, useRouter } from "@/i18n/routing";
import { useAuth } from "@/hooks/use-auth";
import { LoadingPage } from "@/components/loading";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

interface ProtectedLayoutProps {
  children: ReactNode;
}

type AuthState = "loading" | "authenticated" | "unauthenticated";

const LOGIN_PATH = "/login";
const REDIRECT_DELAY = 100;

/**
 * Layout for protected routes that require authentication.
 *
 * - Redirects to login when unauthenticated
 * - Keeps intended destination as `callbackUrl`
 * - Shows loading state while auth initializes
 */
export default function ProtectedLayout({
  children,
}: ProtectedLayoutProps): React.ReactElement | null {
  const { user, isLoading, isAuthenticated, isInitialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [authState, setAuthState] = useState<AuthState>("loading");

  useEffect(() => {
    if (!isInitialized || isLoading) {
      setAuthState("loading");
      return;
    }

    if (isAuthenticated && user) {
      setAuthState("authenticated");
    } else {
      setAuthState("unauthenticated");
    }
  }, [isInitialized, isLoading, isAuthenticated, user]);

  useEffect(() => {
    if (authState !== "unauthenticated") return;

    const redirectTimeout = setTimeout(() => {
      const callbackUrl = encodeURIComponent(pathname);
      router.replace(`${LOGIN_PATH}?callbackUrl=${callbackUrl}`);
    }, REDIRECT_DELAY);

    return () => clearTimeout(redirectTimeout);
  }, [authState, pathname, router]);

  const loadingView = useMemo(
    () => <LoadingPage message="Verifying authentication..." />,
    []
  );

  if (authState === "loading") return loadingView;
  if (authState === "unauthenticated") return null;
  if (!user) return loadingView;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main id="main-content" className="flex-1" role="main">
        {children}
      </main>

      <Footer />
    </div>
  );
}
