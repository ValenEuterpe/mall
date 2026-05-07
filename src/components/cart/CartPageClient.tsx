"use client";

import React, { useCallback, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { toast } from "@/lib/utils/toast";

import { EmptyCart } from "./EmptyCart";
import { CartShopGroup } from "./CartShopGroup";
import { CartSummary } from "./CartSummary";

function CartSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function CartPageClient(): React.ReactElement {
  const t = useTranslations("cart");
  const locale = useLocale();
  const { isAuthenticated } = useAuth();
  const {
    items,
    isHydrated,
    itemCount,
    totalQuantity,
    totalPrice,
    getItemsByShop,
    incrementQuantity,
    decrementQuantity,
    removeItem,
    clearCart,
  } = useCart();

  const handleRemove = useCallback(
    (productId: string) => {
      removeItem(productId);
      toast.success(t("itemRemoved"));
    },
    [removeItem, t]
  );

  const handleClearCart = useCallback(() => {
    clearCart();
    toast.success(t("cleared"));
  }, [clearCart, t]);

  const shopGroups = useMemo(() => {
    const map = getItemsByShop();
    return Array.from(map.entries()).map(([shopId, shopItems]) => {
      const first = shopItems[0];
      return {
        shopId,
        shopName: first?.shopName || shopId,
        shopCode: first?.shopCode,
        items: shopItems,
      };
    });
  }, [getItemsByShop]);

  if (!isHydrated) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <CartSkeleton />
      </div>
    );
  }

  if (itemCount === 0) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <EmptyCart isAuthenticated={isAuthenticated} />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("subtitle", { count: totalQuantity })}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearCart}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t("clearCart")}
        </Button>
      </div>

      {/* Shop Groups + Summary */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {shopGroups.map((group) => (
            <CartShopGroup
              key={group.shopId}
              shopId={group.shopId}
              shopName={group.shopName}
              shopCode={group.shopCode}
              items={group.items}
              locale={locale}
              onIncrement={incrementQuantity}
              onDecrement={decrementQuantity}
              onRemove={handleRemove}
            />
          ))}
        </div>

        <div className="lg:sticky lg:top-24">
          <CartSummary
            totalPrice={totalPrice}
            itemCount={itemCount}
            totalQuantity={totalQuantity}
            locale={locale}
          />
        </div>
      </div>
    </div>
  );
}
