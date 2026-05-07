"use client";

import React, { memo } from "react";
import { useTranslations } from "next-intl";
import { Store } from "lucide-react";

import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/types/product";
import type { CartItem } from "@/lib/cart/types";

import { CartItemRow } from "./CartItemRow";

interface CartShopGroupProps {
  shopId: string;
  shopName: string;
  shopCode?: string;
  items: CartItem[];
  locale: string;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
}

export const CartShopGroup = memo(function CartShopGroup({
  shopId,
  shopName,
  shopCode,
  items,
  locale,
  onIncrement,
  onDecrement,
  onRemove,
}: CartShopGroupProps): React.ReactElement {
  const t = useTranslations("cart");

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Store className="text-muted-foreground h-4 w-4" />
          {shopCode ? (
            <Link
              href={`/shops/${shopCode}`}
              className="hover:text-primary transition-colors hover:underline"
            >
              {shopName}
            </Link>
          ) : (
            <span>{shopName}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {items.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              locale={locale}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              onRemove={onRemove}
            />
          ))}
        </div>

        <Separator className="my-3" />

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            {t("shopSubtotal")}
          </span>
          <span className="font-semibold">
            {formatPrice(subtotal, locale)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
});
