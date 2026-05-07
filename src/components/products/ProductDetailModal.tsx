"use client";

import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  ExternalLink,
  ImageOff,
  Loader2,
  MapPin,
  Package,
  ShoppingCart,
  ShoppingBag,
  Store,
  X,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/utils/toast";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/types/product";
import { useCart } from "@/hooks/use-cart";
import type { CartProduct } from "@/lib/cart/types";

interface ProductShop {
  id: string;
  code: string;
  name: string | null;
  fullCode?: string;
}

interface ProductCategory {
  id: string;
  name: { en: string | null; ru: string | null };
}

interface ProductDetail {
  id: string;
  name: string;
  images: string[];
  description?: string | null;
  pricing: {
    basePrice: number;
    effectivePrice: number;
    hasDiscount?: boolean;
  };
  inventory: {
    stockQuantity: number;
    inStock: boolean;
    sku?: string | null;
  };
  shop?: ProductShop | null;
  category?: ProductCategory | null;
  subcategory?: ProductCategory | null;
  brand?: string | null;
}

export interface ProductDetailModalProps {
  productId: string | null;
  isOpen?: boolean;
  onClose: () => void;
  context?: "user" | "seller";
  onRemoveFromMap?: () => void;
  onAddToMap?: () => void;
  isOnMap?: boolean;
  onEdit?: () => void;
}

export const ProductDetailModal = memo(function ProductDetailModal({
  productId,
  isOpen: isOpenProp,
  onClose,
  context = "user",
  onRemoveFromMap,
  onAddToMap,
  isOnMap: isOnMapProp,
  onEdit,
}: ProductDetailModalProps) {
  const t = useTranslations("productModal");
  const tProducts = useTranslations("products.card");
  const locale = useLocale();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isOnMap, setIsOnMap] = useState(isOnMapProp ?? false);

  const { addItem, isInCart: cartIsInCart } = useCart();

  const isOpen = isOpenProp ?? productId !== null;

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      setCurrentImageIndex(0);
      return;
    }

    let cancelled = false;

    async function fetchProduct(): Promise<void> {
      setLoading(true);
      try {
        const res = await apiClient.get<ProductDetail>(
          `/products/${productId}`,
          {
            showErrorToast: false,
          }
        );
        if (!cancelled && res.success) {
          setProduct(res.data);
          setCurrentImageIndex(0);
        }
      } catch {
        if (!cancelled) {
          toast.error(t("loadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchProduct();
    return () => {
      cancelled = true;
    };
  }, [productId, t]);

  const handlePrevImage = useCallback(() => {
    if (!product) return;
    setCurrentImageIndex((prev) =>
      prev === 0 ? product.images.length - 1 : prev - 1
    );
  }, [product]);

  const handleNextImage = useCallback(() => {
    if (!product) return;
    setCurrentImageIndex((prev) =>
      prev === product.images.length - 1 ? 0 : prev + 1
    );
  }, [product]);

  const handleToggleMap = useCallback(() => {
    if (isOnMap) {
      onRemoveFromMap?.();
      setIsOnMap(false);
    } else {
      onAddToMap?.();
      setIsOnMap(true);
    }
  }, [isOnMap, onRemoveFromMap, onAddToMap]);

  const handleEdit = useCallback(() => {
    onEdit?.();
    onClose();
  }, [onEdit, onClose]);

  const handleAddToCart = useCallback(() => {
    if (!product) return;

    if (cartIsInCart(product.id)) {
      toast.info(tProducts("alreadyInCart"));
      return;
    }

    if (!product.inventory.inStock) {
      toast.error(tProducts("outOfStock"));
      return;
    }

    const cartProduct: CartProduct = {
      id: product.id,
      name: product.name,
      price: product.pricing.effectivePrice,
      images: product.images,
      shopId: product.shop?.id ?? "",
      shopName: product.shop?.name ?? undefined,
      shopCode: product.shop?.fullCode ?? undefined,
    };

    addItem(cartProduct);
    toast.success(tProducts("addedToCart"));
  }, [addItem, cartIsInCart, product, tProducts]);

  const categoryLabel = useMemo(() => {
    if (!product?.category) return null;
    return locale === "ru"
      ? product.category.name.ru
      : product.category.name.en;
  }, [product?.category, locale]);

  const subcategoryLabel = useMemo(() => {
    if (!product?.subcategory) return null;
    return locale === "ru"
      ? product.subcategory.name.ru
      : product.subcategory.name.en;
  }, [product?.subcategory, locale]);

  const formattedPrice = useMemo(() => {
    if (!product) return null;
    return formatPrice(product.pricing.effectivePrice, locale);
  }, [product, locale]);

  const formattedBasePrice = useMemo(() => {
    if (!product || !product.pricing.hasDiscount) return null;
    return formatPrice(Number(product.pricing.basePrice), locale);
  }, [product, locale]);

  const productPageUrl = product ? `/products/${product.id}` : null;
  const shopPageUrl = product?.shop ? `/shops/${product.shop.code}` : null;

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="flex-row items-center justify-between space-y-0">
          <DialogTitle>{t("title")}</DialogTitle>
          {productPageUrl && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={productPageUrl} target="_blank">
                <ExternalLink className="mr-1.5 h-4 w-4" />
                {t("openInNewPage")}
              </Link>
            </Button>
          )}
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="aspect-[4/3] w-full rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-20 w-full" />
          </div>
        ) : product ? (
          <div className="space-y-4">
            <div className="bg-muted relative aspect-[4/3] overflow-hidden rounded-lg">
              {product.images.length > 0 ? (
                <>
                  <Image
                    src={product.images[currentImageIndex]}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 600px"
                    priority
                  />
                  {product.images.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="bg-background/80 absolute top-1/2 left-2 h-8 w-8 -translate-y-1/2 backdrop-blur-sm"
                        onClick={handlePrevImage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="bg-background/80 absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2 backdrop-blur-sm"
                        onClick={handleNextImage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                        {product.images.map((_, idx) => (
                          <button
                            key={idx}
                            className={cn(
                              "h-2 w-2 rounded-full transition-all",
                              idx === currentImageIndex
                                ? "bg-primary"
                                : "bg-background/80"
                            )}
                            onClick={() => setCurrentImageIndex(idx)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ImageOff className="text-muted-foreground h-12 w-12" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xl font-semibold">{product.name}</h3>
                <Badge
                  variant={
                    product.inventory.inStock ? "default" : "destructive"
                  }
                  className={cn(product.inventory.inStock && "bg-green-600")}
                >
                  {product.inventory.inStock
                    ? `${product.inventory.stockQuantity} ${t("inStock")}`
                    : t("outOfStock")}
                </Badge>
              </div>
              {formattedBasePrice ? (
                <div className="flex items-baseline gap-2">
                  <p className="text-destructive text-2xl font-bold">
                    {formattedPrice}
                  </p>
                  <p className="text-muted-foreground text-base line-through">
                    {formattedBasePrice}
                  </p>
                </div>
              ) : (
                <p className="text-primary text-2xl font-bold">
                  {formattedPrice}
                </p>
              )}
              {product.brand && (
                <p className="text-muted-foreground text-sm">
                  {t("brand")}: {product.brand}
                </p>
              )}
            </div>

            {product.description && (
              <p className="text-muted-foreground text-sm">
                {product.description}
              </p>
            )}

            {product.shop && (
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Store className="text-muted-foreground h-4 w-4" />
                  <span className="font-medium">
                    {product.shop.name || product.shop.code}
                  </span>
                </div>
              </div>
            )}

            {(categoryLabel || subcategoryLabel) && (
              <div className="flex flex-wrap gap-2">
                {categoryLabel && (
                  <Badge variant="secondary">{categoryLabel}</Badge>
                )}
                {subcategoryLabel && (
                  <Badge variant="outline">{subcategoryLabel}</Badge>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="text-muted-foreground h-12 w-12" />
            <p className="text-muted-foreground mt-2 text-sm">
              {t("notFound")}
            </p>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {context === "seller" && product && (
            <Button variant="outline" onClick={handleEdit}>
              <Edit2 className="mr-1.5 h-4 w-4" />
              {t("editProduct")}
            </Button>
          )}

          {context === "user" && product && (
            <>
              <Button
                variant={isOnMap ? "secondary" : "outline"}
                onClick={handleToggleMap}
              >
                {isOnMap ? (
                  <>
                    <X className="mr-1.5 h-4 w-4" />
                    {t("removeFromMap")}
                  </>
                ) : (
                  <>
                    <MapPin className="mr-1.5 h-4 w-4" />
                    {t("addToMap")}
                  </>
                )}
              </Button>
              <Button
                variant={cartIsInCart(product.id) ? "secondary" : "default"}
                onClick={handleAddToCart}
                disabled={
                  !product.inventory.inStock || cartIsInCart(product.id)
                }
              >
                <ShoppingCart className="mr-1.5 h-4 w-4" />
                {cartIsInCart(product.id)
                  ? tProducts("alreadyInCart")
                  : tProducts("addToCart")}
              </Button>
              {shopPageUrl && (
                <Button asChild variant="outline">
                  <Link href={shopPageUrl}>
                    <Store className="mr-1.5 h-4 w-4" />
                    {t("viewShop")}
                  </Link>
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default ProductDetailModal;
