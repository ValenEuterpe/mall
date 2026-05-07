"use client";

import { useTranslations } from "next-intl";
import { ShoppingCart, ArrowLeft, LogIn } from "lucide-react";

import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyCartProps {
  isAuthenticated?: boolean;
}

export function EmptyCart({ isAuthenticated = true }: EmptyCartProps): React.ReactElement {
  const t = useTranslations("cart");

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <ShoppingCart className="text-muted-foreground/50 mb-4 h-16 w-16" />
          <h2 className="mb-2 text-xl font-semibold">{t("loginToShop")}</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            {t("loginToShopDescription")}
          </p>
          <Button asChild>
            <Link href="/login">
              <LogIn className="mr-2 h-4 w-4" />
              {t("loginButton")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <ShoppingCart className="text-muted-foreground/50 mb-4 h-16 w-16" />
        <h2 className="mb-2 text-xl font-semibold">{t("empty")}</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          {t("emptyDescription")}
        </p>
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("browseProducts")}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
