import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CartPageClient } from "@/components/cart";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cart" });

  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function CartPage(): Promise<React.ReactElement> {
  return <CartPageClient />;
}
