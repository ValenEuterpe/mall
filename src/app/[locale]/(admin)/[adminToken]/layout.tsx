import type { ReactNode } from "react";

import { getTranslations } from "next-intl/server";

import { env } from "@/env";
import { Link } from "@/i18n/routing";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ShieldX, ArrowLeft, AlertTriangle } from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
  params: Promise<{ adminToken: string }>;
}

function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function AccessDeniedView({
  title,
  message,
  backLabel,
}: {
  title: string;
  message: string;
  backLabel: string;
}): React.ReactElement {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="bg-destructive/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
          <ShieldX className="text-destructive h-8 w-8" />
        </div>

        <Alert variant="destructive" className="text-left">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>

        <Button variant="outline" asChild className="gap-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
      </div>
    </div>
  );
}

function AdminHeader({
  title,
  modeLabel,
}: {
  title: string;
  modeLabel: string;
}): React.ReactElement {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-md">
            <span className="text-primary-foreground text-sm font-bold">A</span>
          </div>
          <span className="font-semibold">{title}</span>
        </div>

        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            {modeLabel}
          </span>
        </div>
      </div>
    </header>
  );
}

/**
 * Layout for admin routes with token-based access.
 *
 * IMPORTANT:
 * - Token validation is performed server-side (no client-side env exposure)
 * - The token must match `env.ADMIN_TOKEN`
 */
export default async function AdminLayout({
  children,
  params,
}: AdminLayoutProps): Promise<React.ReactElement> {
  const t = await getTranslations("adminPanel");
  const { adminToken } = await params;

  const expected = env.ADMIN_TOKEN;

  if (!expected) {
    return (
      <AccessDeniedView
        title={t("accessDenied.title")}
        message={t("accessDenied.notConfigured")}
        backLabel={t("accessDenied.backHome")}
      />
    );
  }

  const isValid = secureCompare(adminToken, expected);

  if (!isValid) {
    return (
      <AccessDeniedView
        title={t("accessDenied.title")}
        message={t("accessDenied.invalidToken")}
        backLabel={t("accessDenied.backHome")}
      />
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <AdminHeader title={t("header.title")} modeLabel={t("header.mode")} />

      <div className="container py-6">
        <nav className="mb-6 flex items-center gap-4 text-sm">
          <Link
            href={`/admin/${adminToken}/dashboard`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("nav.dashboard")}
          </Link>
          <Link
            href={`/admin/${adminToken}/users`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("nav.users")}
          </Link>
          <Link
            href={`/admin/${adminToken}/settings`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("nav.settings")}
          </Link>
        </nav>

        <main role="main">{children}</main>
      </div>
    </div>
  );
}
