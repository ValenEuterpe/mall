import { redirect } from "next/navigation";

export default async function SellerIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<never> {
  const { locale } = await params;
  redirect(`/${locale}/seller/dashboard`);
}
