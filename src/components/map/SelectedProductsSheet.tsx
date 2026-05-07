"use client";

import React, { memo, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import { useMapSelection } from "@/hooks/use-map-selection";
import { Link } from "@/i18n/routing";
import { formatShopLocation } from "@/lib/utils/format-shop-location";

type BatchProduct = {
  id: string;
  name: string;
  images: string[];
  basePrice: number;
  shop: { id: string; fullCode: string; shopName: string | null; svgId: string | null };
};

export const SelectedProductsSheet = memo(function SelectedProductsSheet() {
  const t = useTranslations("map");
  const tCommon = useTranslations("common");
  const { productIds, removeProduct, clear } = useMapSelection();

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<BatchProduct[]>([]);

  const idsKey = useMemo(() => productIds.join(","), [productIds]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (productIds.length === 0) {
        setProducts([]);
        return;
      }

      try {
        setLoading(true);

        const res = await apiClient.post<{ products: BatchProduct[] }>("/products/batch", {
          ids: productIds,
        });

        if (!res.success) throw new Error(res.error.message);

        if (!cancelled) {
          setProducts(res.data.products);
        }
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary">{t("selection.open")}</Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80vh]">
        <SheetHeader>
          <SheetTitle>{t("selection.title")}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {productIds.length === 0
                ? t("selection.empty")
                : t("selection.itemsCount", { count: productIds.length })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clear}
              disabled={productIds.length === 0}
            >
              {t("clearAll")}
            </Button>
          </div>

          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {!loading && productIds.length === 0 && (
            <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
              {t("selection.empty")}
            </div>
          )}

          {!loading && products.length > 0 && (
            <div className="space-y-2">
              {products.map((p) => (
                <Card key={p.id} className="flex items-center gap-3 p-2">
                  <div className="h-14 w-14 overflow-hidden rounded-md bg-muted">
                    <img src={p.images?.[0] || ""} alt={p.name} className="h-full w-full object-cover" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link href={`/products/${p.id}`} className="block">
                      <p className="line-clamp-1 text-sm font-medium">{p.name}</p>
                    </Link>
                    <Link href={`/shops/${p.shop.fullCode}`} className="block text-xs text-muted-foreground">
                      {p.shop.shopName || formatShopLocation(p.shop.fullCode, tCommon)}
                    </Link>
                  </div>

                  <Button variant="ghost" size="sm" onClick={() => removeProduct(p.id)}>
                    {t("selection.remove")}
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
});
