import { Suspense } from "react";

import { ShopDetailClient } from "@/components/shops/ShopDetailClient";

export default async function ShopDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<React.ReactElement> {
  const { code } = await params;

  return (
    <Suspense>
      <ShopDetailClient code={code} />
    </Suspense>
  );
}
