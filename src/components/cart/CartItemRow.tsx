"use client";

import React, { memo, useCallback } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Minus, Plus, Trash2, ImageOff } from "lucide-react";

import { Button } from "@/components/ui/button";

import { formatPrice } from "@/types/product";
import type { CartItem } from "@/lib/cart/types";

interface CartItemRowProps {
  item: CartItem;
  locale: string;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
}

export const CartItemRow = memo(function CartItemRow({
  item,
  locale,
  onIncrement,
  onDecrement,
  onRemove,
}: CartItemRowProps): React.ReactElement {
  const t = useTranslations("cart");
  const primaryImage = item.images?.[0];
  const lineTotal = item.price * item.quantity;

  const handleIncrement = useCallback(
    () => onIncrement(item.id),
    [onIncrement, item.id]
  );
  const handleDecrement = useCallback(
    () => onDecrement(item.id),
    [onDecrement, item.id]
  );
  const handleRemove = useCallback(
    () => onRemove(item.id),
    [onRemove, item.id]
  );

  return (
    <div className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:gap-4">
      {/* Product Image */}
      <div className="bg-muted relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md md:h-20 md:w-20">
        {primaryImage ? (
          <Image
            src={primaryImage}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 56px, 80px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff className="text-muted-foreground h-5 w-5 md:h-6 md:w-6" />
          </div>
        )}
      </div>

      {/* Middle Section */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center md:gap-1">
        {/* Product Info */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h4 className="line-clamp-2 text-sm font-medium">{item.name}</h4>
          <p className="text-muted-foreground text-xs md:hidden">
            {formatPrice(item.price, locale)} {t("perItem")}
          </p>
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 md:h-8 md:w-8"
            onClick={handleDecrement}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">
            {item.quantity}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 md:h-8 md:w-8"
            onClick={handleIncrement}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Line Total */}
        <div className="text-right md:w-24">
          <p className="text-sm font-semibold">
            {formatPrice(lineTotal, locale)}
          </p>
          <p className="text-muted-foreground hidden text-xs md:block">
            {formatPrice(item.price, locale)} {t("perItem")}
          </p>
        </div>
      </div>

      {/* Remove */}
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive h-8 w-8 flex-shrink-0 self-end md:self-auto"
        onClick={handleRemove}
        aria-label={t("remove")}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
});
