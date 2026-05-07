"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Store,
  Package,
  Eye,
  MapPin,
  Plus,
  Pencil,
  Loader2,
} from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { useRequireRole } from "@/hooks/use-auth";
import { useProducts } from "@/hooks/use-products";
import { Link } from "@/i18n/routing";
import { formatShopLocation } from "@/lib/utils/format-shop-location";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserProductCard } from "@/components/products";

interface SellerShop {
  id: string;
  code: string;
  name: string | null;
  floor: number | null;
  building: string | null;
  venue: string | null;
}

interface SellerProfile {
  id: string;
  businessName: string | null;
  contactPerson: string | null;
  phone: string | null;
  description: string | null;
  logoUrl: string | null;
  shops: SellerShop[];
}

interface ShopDetail {
  id: string;
  fullCode: string;
  shopName: string | null;
  description: string | null;
  imageUrl: string | null;
  venue: string;
  building: string | null;
  floor: string | null;
  shopNumber: string;
  contacts: { id: string; type: string; value: string; label: string | null }[];
}

export default function SellerShopPage(): React.ReactElement {
  useRequireRole("SELLER", "/unauthorized");
  const t = useTranslations("seller.shop");
  const tCommon = useTranslations("common");

  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [shopDetail, setShopDetail] = useState<ShopDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const shop = profile?.shops?.[0] ?? null;

  const {
    products,
    total,
    isLoading: productsLoading,
  } = useProducts({
    shopId: shop?.id,
    initialLimit: 20,
    sort: { field: "createdAt", order: "desc" },
    enabled: !!shop?.id,
  });

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const [profileRes, shopRes] = await Promise.all([
        apiClient.get<SellerProfile>("/sellers/profile"),
        apiClient.get<ShopDetail>("/sellers/shop"),
      ]);
      if (profileRes.success && profileRes.data) {
        setProfile(profileRes.data);
      }
      if (shopRes.success && shopRes.data) {
        setShopDetail(shopRes.data);
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      setError(t("loadError"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-6xl space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto max-w-6xl p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="text-muted-foreground/50 mb-4 h-12 w-12" />
            <p className="text-muted-foreground">{error || t("noShop")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="container mx-auto max-w-6xl p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="text-muted-foreground/50 mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">{t("noShop")}</h3>
            <p className="text-muted-foreground text-sm">
              {t("noShopDescription")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("shopPreview")}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/seller/shop/edit">
            <Pencil className="mr-2 h-4 w-4" />
            {t("editShop")}
          </Link>
        </Button>
      </div>

      {/* Shop Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="bg-muted h-16 w-16 shrink-0 overflow-hidden rounded-lg">
              {shopDetail?.imageUrl ? (
                <img
                  src={shopDetail.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="bg-primary/10 flex h-full w-full items-center justify-center">
                  <Store className="text-primary h-7 w-7" />
                </div>
              )}
            </div>
            <div>
              <CardTitle>
                {shopDetail?.shopName ||
                  profile.businessName ||
                  shop.name ||
                  formatShopLocation(shop.code, tCommon)}
              </CardTitle>
              <CardDescription className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[
                  shop.venue,
                  shop.building,
                  shop.floor != null ? `${t("floor")} ${shop.floor}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        {(shopDetail?.description || profile.description) && (
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {shopDetail?.description || profile.description}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Package className="text-muted-foreground h-8 w-8" />
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-muted-foreground text-xs">
                {t("totalProducts")}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Badge
              variant="secondary"
              className="h-8 w-8 items-center justify-center rounded-md p-0"
            >
              <Package className="h-4 w-4" />
            </Badge>
            <div>
              <p className="text-2xl font-bold">
                {products.filter((p) => p.inStock).length}
              </p>
              <p className="text-muted-foreground text-xs">
                {t("activeProducts")}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Eye className="text-muted-foreground h-8 w-8" />
            <div>
              <p className="text-2xl font-bold">—</p>
              <p className="text-muted-foreground text-xs">{t("totalViews")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">{t("products")}</h2>

        {productsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="text-muted-foreground/50 mb-3 h-10 w-10" />
              <p className="text-muted-foreground mb-3 text-sm">
                {t("noProducts")}
              </p>
              <Button asChild size="sm">
                <Link href="/seller/products/new">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("addFirstProduct")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]">
            {products.map((product) => (
              <UserProductCard
                key={product.id}
                product={{
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
                    shopName:
                      product.shop.businessName ??
                      product.shop.name ??
                      undefined,
                  },
                  category: product.category
                    ? {
                        id: product.category.id,
                        name_en: product.category.name.en,
                        name_ru: product.category.name.ru,
                      }
                    : undefined,
                }}
                showShopInfo={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
