"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/types/product";

interface CartSummaryProps {
  totalPrice: number;
  itemCount: number;
  totalQuantity: number;
  locale: string;
}

export function CartSummary({
  totalPrice,
  itemCount,
  totalQuantity,
  locale,
}: CartSummaryProps): React.ReactElement {
  const t = useTranslations("cart");

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t("items")} ({totalQuantity})
          </span>
          <span>{formatPrice(totalPrice, locale)}</span>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">{t("total")}</span>
          <span className="text-primary text-xl font-bold">
            {formatPrice(totalPrice, locale)}
          </span>
        </div>

        <Button variant="outline" className="w-full" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("continueShopping")}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
