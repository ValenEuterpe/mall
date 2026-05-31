import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { isLocale, routing } from "@/i18n/routing";
import { PageErrorBoundary } from "@/components/error-boundary/variants";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/hooks/use-auth";
import { AuthAwareCartProvider } from "@/hooks/use-cart";
import { AuthAwareMapSelectionProvider } from "@/hooks/use-map-selection";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "metadata" });

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://wholesalemarket.com";

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: t("title"),
      template: `%s | ${t("siteName")}`,
    },
    description: t("description"),
    keywords: t("keywords")
      .split(",")
      .map((k) => k.trim()),
    authors: [{ name: t("siteName") }],
    creator: t("siteName"),
    publisher: t("siteName"),
    alternates: {
      canonical: baseUrl,
      languages: {
        en: `${baseUrl}/en`,
        ru: `${baseUrl}/ru`,
        am: `${baseUrl}/am`,
      },
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const messages = await getMessages({ locale });

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <PageErrorBoundary>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <AuthProvider>
            <AuthAwareCartProvider>
              <AuthAwareMapSelectionProvider>
                <a
                  href="#main-content"
                  className="focus:bg-primary focus:text-primary-foreground sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2"
                >
                  Skip to content
                </a>

                <div
                  id="main-content"
                  className="relative flex min-h-screen flex-col"
                >
                  {children}
                </div>

                <ToastProvider />
              </AuthAwareMapSelectionProvider>
            </AuthAwareCartProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </PageErrorBoundary>
    </ThemeProvider>
  );
}
