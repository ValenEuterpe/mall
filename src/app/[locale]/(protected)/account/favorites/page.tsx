"use client";

import { useTranslations } from "next-intl";
import { Heart, ArrowLeft } from "lucide-react";

import { Link } from "@/i18n/routing";
import { useFavorites } from "@/hooks/use-favorites";
import { toast } from "@/lib/utils/toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserProductCard } from "@/components/products";

function mapToProductCard(product: {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  stockQuantity: number;
  images: string[];
  brand: string | null;
  shop: {
    id: string;
    code: string;
    name: string | null;
    venue: string | null;
    building: string | null;
    floor: string | null;
  };
  category: {
    id: string;
    name: Record<string, string>;
  } | null;
}) {
  return {
    id: product.id,
    name: product.name,
    description: product.description ?? undefined,
    basePrice: product.basePrice,
    stockQuantity: product.stockQuantity,
    images: product.images,
    brand: product.brand ?? undefined,
    shop: {
      id: product.shop.id,
      fullCode: product.shop.code,
      shopName: product.shop.name ?? undefined,
      venue: product.shop.venue ?? undefined,
      building: product.shop.building ?? undefined,
      floor: product.shop.floor ?? undefined,
    },
    category: product.category
      ? {
          id: product.category.id,
          name_en: product.category.name?.en ?? "",
          name_ru: product.category.name?.ru ?? "",
        }
      : undefined,
  };
}

function SkeletonGrid() {
  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </div>
  );
}

export default function FavoritesPage(): React.ReactElement {
  const t = useTranslations("account.favorites");
  const { favorites, isLoading, error, removeFavorite, refetch } =
    useFavorites();

  if (isLoading) {
    return <SkeletonGrid />;
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-6xl p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Heart className="text-muted-foreground/50 mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">{t("error")}</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              {t("errorDescription")}
            </p>
            <Button onClick={() => refetch()}>{t("retry")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="container mx-auto max-w-6xl p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Heart className="text-muted-foreground/50 mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">{t("empty")}</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              {t("emptyDescription")}
            </p>
            <Button asChild>
              <Link href="/products">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("browseProducts")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("subtitle", { count: favorites.length })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {favorites.map((fav) => (
          <UserProductCard
            key={fav.productId}
            product={mapToProductCard(fav.product)}
            isFavorite={true}
            onToggleFavorite={async () => {
              const success = await removeFavorite(fav.productId);
              if (success) {
                toast.success(t("removedFromFavorites"));
              } else {
                toast.error(t("removeError"));
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}
