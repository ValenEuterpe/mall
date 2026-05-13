"use client";

import React, { use, useCallback, useMemo } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  Check,
  ChevronLeft,
  ExternalLink,
  Heart,
  ImageOff,
  MapPin,
  Package,
  ShoppingCart,
} from "lucide-react";

import { UserProductCard } from "@/components/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useRouter } from "@/i18n/routing";
import { useCart } from "@/hooks/use-cart";
import type { CartProduct } from "@/lib/cart/types";
import { toast } from "@/lib/utils/toast";
import { cn } from "@/lib/utils";
import { formatAmdPrice } from "@/lib/utils/price";
import {
  useProduct,
  useProducts,
  type ProductListItem,
} from "@/hooks/use-products";
import { StorefrontIcon } from "@/components/icons/Storefront";
import { useOptionalFavorites } from "@/hooks/use-optional-favorites";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("products.detail");
  const tCard = useTranslations("products.card");
  const locale = useLocale();
  const router = useRouter();

  const { product, isLoading, error } = useProduct(id);
  const { addItem, isInCart } = useCart();
  const { isFavorite, toggleFavorite } = useOptionalFavorites();

  const inCart = product ? isInCart(product.id) : false;
  const inStock = product ? product.inventory.inStock : false;

  const formattedPrice = useMemo(() => {
    if (!product) return "";
    return formatAmdPrice(product.pricing.effectivePrice, locale);
  }, [locale, product]);

  const categoryLabel = useMemo(() => {
    if (!product?.category) return null;
    return locale === "ru"
      ? product.category.name.ru
      : product.category.name.en;
  }, [locale, product?.category]);

  const handleAddToCart = useCallback(() => {
    if (!product) return;

    if (inCart) {
      toast.info(tCard("alreadyInCart"));
      return;
    }

    if (!inStock) {
      toast.error(tCard("outOfStock"));
      return;
    }

    const cartProduct: CartProduct = {
      id: product.id,
      name: product.name,
      price: product.pricing.effectivePrice,
      images: product.images,
      shopId: product.shop.id,
      shopName: product.shop.name ?? product.shop.code,
      shopLocation: {
        venue: product.shop.location.venue ?? "",
        building: product.shop.location.building ?? undefined,
        floor: product.shop.location.floor ?? undefined,
        svgId: product.shop.location.svgId ?? undefined,
      },
    };

    addItem(cartProduct);
    toast.success(tCard("addedToCart"));
  }, [addItem, inCart, inStock, product, tCard]);

  const handleAddToRoute = useCallback(() => {
    if (!product) return;

    if (inCart) {
      toast.info(t("alreadyInRoute"));
      return;
    }

    if (!inStock) {
      toast.error(t("outOfStock"));
      return;
    }

    const cartProduct: CartProduct = {
      id: product.id,
      name: product.name,
      price: product.pricing.effectivePrice,
      images: product.images,
      shopId: product.shop.id,
      shopName: product.shop.name ?? product.shop.code,
      shopLocation: {
        venue: product.shop.location.venue ?? "",
        building: product.shop.location.building ?? undefined,
        floor: product.shop.location.floor ?? undefined,
        svgId: product.shop.location.svgId ?? undefined,
      },
    };

    addItem(cartProduct);

    toast.success(t("addedToRoute"), {
      action: {
        label: t("viewRoute"),
        onClick: () => {
          router.push("/");
        },
      },
    });
  }, [addItem, inCart, inStock, product, t, router]);

  const handleWishlist = useCallback(() => {
    if (!product) return;
    toggleFavorite(product.id);
  }, [product, toggleFavorite]);

  const { products: relatedList, isLoading: relatedLoading } = useProducts({
    categoryId: product?.category?.id ?? undefined,
    enabled: Boolean(product?.category?.id),
    initialLimit: 4,
  });

  const relatedProducts = useMemo(() => {
    const toCardProduct = (p: ProductListItem) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? undefined,
      basePrice: p.effectivePrice ?? p.basePrice,
      stockQuantity: p.stockQuantity,
      images: p.images,
      brand: p.brand ?? undefined,
      shop: {
        id: p.shop.id,
        fullCode: p.shop.code,
        shopName: p.shop.name ?? undefined,
      },
      category: p.category
        ? {
            id: p.category.id,
            name_en: p.category.name.en,
            name_ru: p.category.name.ru,
          }
        : undefined,
    });

    return relatedList
      .filter((p) => p.id !== product?.id)
      .slice(0, 4)
      .map(toCardProduct);
  }, [product?.id, relatedList]);

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="mb-6 h-4 w-48" />
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product || error) {
    return (
      <div className="container flex flex-col items-center justify-center py-24 text-center">
        <Package className="text-muted-foreground mb-4 h-16 w-16" />
        <h1 className="mb-2 text-2xl font-bold">{t("notFound")}</h1>
        <p className="text-muted-foreground mb-6">{t("notFoundDescription")}</p>
        <Button asChild>
          <Link href="/products">
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t("backToProducts")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-6 lg:py-8">
      <div className="mb-6">
        <nav className="text-muted-foreground text-sm">
          <Link href="/">{t("breadcrumb.home")}</Link>
          <span className="mx-2">/</span>
          <Link href="/products">{t("breadcrumb.products")}</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="bg-muted relative aspect-square overflow-hidden rounded-lg">
            {product.images[0] ? (
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <ImageOff className="text-muted-foreground h-16 w-16" />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              {product.brand && (
                <p className="text-muted-foreground mb-1 text-sm font-medium tracking-wider uppercase">
                  {product.brand}
                </p>
              )}
              <h1 className="text-2xl font-bold lg:text-3xl">{product.name}</h1>
              {categoryLabel && (
                <Badge variant="secondary" className="mt-2">
                  {categoryLabel}
                </Badge>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleWishlist}
                aria-label={
                  product && isFavorite(product.id)
                    ? t("wishlistRemoveLabel")
                    : t("wishlistAddLabel")
                }
                type="button"
              >
                <Heart
                  className={cn(
                    "h-4 w-4",
                    product &&
                      isFavorite(product.id) &&
                      "fill-yellow-400 text-yellow-400"
                  )}
                />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={handleAddToCart}
                disabled={!inStock}
                aria-label={tCard("addToCart")}
                type="button"
              >
                <ShoppingCart
                  className={cn(
                    "h-4 w-4",
                    inCart && "fill-primary text-primary"
                  )}
                />
              </Button>

              <Button
                variant="outline"
                size="icon"
                asChild
                aria-label={tCard("quickActions.viewShop")}
                type="button"
              >
                <Link href={`/shops/${product.shop.code}`}>
                  <StorefrontIcon className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex items-baseline gap-4">
            <span className="text-primary text-3xl font-bold lg:text-4xl">
              {formattedPrice}
            </span>
            {!inStock && <Badge variant="destructive">{t("outOfStock")}</Badge>}
          </div>

          <Separator />

          <div className="space-y-6">
            <div>
              <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
                {t("tabs.description")}
              </h2>
              {product.description ? (
                <p className="text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              ) : (
                <p className="text-muted-foreground italic">
                  {t("noDescription")}
                </p>
              )}
            </div>

            <div>
              <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
                {t("tabs.details")}
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">
                    {t("fields.stock")}
                  </span>
                  <span className="font-medium">
                    {product.inventory.stockQuantity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("fields.shop")}
                  </span>
                  <span className="font-medium">
                    {product.shop.name ?? product.shop.code}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex gap-4">
            <Button
              size="lg"
              className="flex-1"
              onClick={handleAddToRoute}
              disabled={!inStock || inCart}
            >
              {inCart ? (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  {t("inRoute")}
                </>
              ) : (
                <>
                  <MapPin className="mr-2 h-5 w-5" />
                  {t("addToMap")}
                </>
              )}
            </Button>

            {inCart && (
              <Button size="lg" variant="outline" className="flex-1" asChild>
                <Link href="/map">
                  {t("viewOnMap")}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">{t("relatedProducts")}</h2>
          {relatedLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((p) => (
                <UserProductCard
                  key={p.id}
                  product={p}
                  isFavorite={isFavorite(p.id)}
                  onToggleFavorite={() => toggleFavorite(p.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
