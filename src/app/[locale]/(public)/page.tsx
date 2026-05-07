import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { UnifiedPageClient } from "@/components/home/UnifiedPageClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function HomePage(): Promise<React.ReactElement> {
  return (
    <Suspense>
      <UnifiedPageClient />
    </Suspense>
  );
}
