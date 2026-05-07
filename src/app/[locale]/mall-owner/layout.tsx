"use client";

import React, { useEffect, useMemo, useState, type ReactNode } from "react";

import { useSearchParams } from "next/navigation";

import { usePathname, useRouter } from "@/i18n/routing";
import { useAuth } from "@/hooks/use-auth";
import { LoadingPage } from "@/components/loading";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

interface MallOwnerLayoutProps {
  children: ReactNode;
}

type AuthState = "loading" | "authenticated" | "unauthenticated";

const LOGIN_PATH = "/auth/mall-owner/login";
const REDIRECT_DELAY = 100;

/**
 * Mall Owner route group.
 *
 * - Requires an authenticated session with role `MALL_OWNER`
 * - Redirects unauthenticated users to the Mall Owner login (magic-link request)
 */
export default function MallOwnerLayout({ children }: MallOwnerLayoutProps): React.ReactElement | null {
  const { user, isLoading, isAuthenticated, isInitialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isMagicLinkCallback = pathname.endsWith("/mall-owner/dashboard") && Boolean(searchParams.get("token"));

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

    // Special case: allow magic-link callbacks to render the dashboard verification screen
    // without redirecting to the login page.
    if (isMagicLinkCallback) return;

    const redirectTimeout = setTimeout(() => {
      const callbackUrl = encodeURIComponent(pathname);
      router.replace(`${LOGIN_PATH}?callbackUrl=${callbackUrl}`);
    }, REDIRECT_DELAY);

    return () => clearTimeout(redirectTimeout);
  }, [authState, isMagicLinkCallback, pathname, router]);

  const loadingView = useMemo(() => <LoadingPage message="" />, []);

  if (authState === "loading") return loadingView;
  if (authState === "unauthenticated") {
    if (isMagicLinkCallback) return <>{children}</>;
    return null;
  }
  if (!user) return loadingView;

  if (user.role !== "MALL_OWNER") {
    router.replace("/unauthorized");
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
