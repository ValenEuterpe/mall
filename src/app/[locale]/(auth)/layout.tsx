import type { ReactNode } from "react";
import type { Metadata } from "next";

import { Link } from "@/i18n/routing";
import { BackButton } from "@/components/auth/BackButton";
import { LanguageSwitcher } from "@/components/layout/Header";

interface AuthLayoutProps {
  children: ReactNode;
}

export const metadata: Metadata = {
  title: {
    template: "%s | Authentication",
    default: "Authentication",
  },
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Layout for authentication pages (login, signup, reset password, etc.).
 *
 * - Centered card layout
 * - Subtle gradient background
 * - No header/footer for focused UX
 */
export default function AuthLayout({
  children,
}: AuthLayoutProps): React.ReactElement {
  return (
    <div
      className="from-background via-background to-muted flex min-h-screen flex-col items-center justify-center bg-gradient-to-br p-4 sm:p-6 md:p-8"
      role="main"
      aria-label="Authentication"
    >
      {/* Decorative background elements */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="bg-primary/5 absolute -top-1/4 -left-1/4 h-1/2 w-1/2 rounded-full blur-3xl" />
        <div className="bg-secondary/5 absolute -right-1/4 -bottom-1/4 h-1/2 w-1/2 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-block transition-opacity hover:opacity-80"
            aria-label="Go to homepage"
          >
            <span className="text-foreground text-2xl font-bold tracking-tight">
              Wholesale Market
            </span>
          </Link>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-lg sm:p-8">
          <div className="mb-4 flex items-center justify-between">
            <BackButton />
            <LanguageSwitcher />
          </div>
          {children}
        </div>

        <div className="text-muted-foreground mt-6 text-center text-sm">
          <p>
            Need help?{" "}
            <Link
              href="/support"
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
