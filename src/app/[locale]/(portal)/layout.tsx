"use client";

import React, { useEffect, useMemo, useState, type ReactNode } from "react";

import { usePathname, useRouter } from "@/i18n/routing";
import { useAuth } from "@/hooks/use-auth";
import { LoadingPage } from "@/components/loading";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

interface PortalLayoutProps {
  children: ReactNode;
}

type AuthState = "loading" | "authenticated" | "unauthenticated";

const LOGIN_PATH = "/admin-login";
const REDIRECT_DELAY = 100;

export default function PortalLayout({
  children,
}: PortalLayoutProps): React.ReactElement | null {
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

  // Redirect non-SELLER roles
  useEffect(() => {
    if (authState !== "authenticated" || !user) return;
    if (user.role !== "SELLER") {
      router.replace("/unauthorized");
    }
  }, [authState, user, router]);

  const loadingView = useMemo(() => <LoadingPage message="" />, []);

  if (authState === "loading") return loadingView;
  if (authState === "unauthenticated") return null;
  if (!user) return loadingView;
  if (user.role !== "SELLER") return null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
