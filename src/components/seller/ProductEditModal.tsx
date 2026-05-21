"use client";

import React, { memo, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ExternalLink, Loader2, ShoppingBag } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/utils/toast";
import {
  ProductForm,
  type ProductFormData,
} from "@/components/seller/ProductForm";

interface SellerProductDetail {
  id: string;
  name: string;
  description?: string | null;
  name_en?: string | null;
  name_ru?: string | null;
  name_am?: string | null;
  description_en?: string | null;
  description_ru?: string | null;
  description_am?: string | null;
  basePrice: number;
  stockQuantity: number;
  sku: string | null;
  barcode: string | null;
  status: "DRAFT" | "PUBLISHED";
  isActive: boolean;
  images: string[];
  categoryId?: string;
  subcategoryId?: string;
  tagIds?: string[];
}

export interface ProductEditModalProps {
  productId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const ProductEditModal = memo(function ProductEditModal({
  productId,
  isOpen,
  onClose,
  onSaved,
}: ProductEditModalProps) {
  const t = useTranslations("seller.products");
  const tModal = useTranslations("productModal");
  const locale = useLocale();

  const [product, setProduct] = useState<SellerProductDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId || !isOpen) {
      setProduct(null);
      return;
    }

    let cancelled = false;

    async function fetchProduct(): Promise<void> {
      setLoading(true);
      try {
        const res = await apiClient.get<SellerProductDetail>(
          `/sellers/products/${productId}`,
          { locale },
          { showErrorToast: false }
        );
        if (!cancelled && res.success) {
          setProduct(res.data);
        }
      } catch {
        if (!cancelled) {
          toast.error(t("loadError") || tModal("loadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchProduct();
    return () => {
      cancelled = true;
    };
  }, [productId, isOpen, locale, t, tModal]);

  const editPageUrl = productId ? `/seller/products/${productId}/edit` : null;

  const transformProductToFormData = (
    p: SellerProductDetail
  ): Partial<ProductFormData> => ({
    name: p.name,
    name_en: p.name_en || "",
    name_ru: p.name_ru || "",
    name_am: p.name_am || "",
    description: p.description || "",
    description_en: p.description_en || "",
    description_ru: p.description_ru || "",
    description_am: p.description_am || "",
    price: String(p.basePrice || 0),
    stockQuantity: String(p.stockQuantity || 0),
    sku: p.sku || "",
    barcode: p.barcode || "",
    categoryId: p.categoryId || "",
    subcategoryId: p.subcategoryId || "",
    tagIds: p.tagIds || [],
    isActive: p.isActive,
    status: p.status,
    images: p.images || [],
  });

  const handleFormSuccess = () => {
    onClose();
    onSaved?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"
        aria-describedby={undefined}
      >
        <DialogHeader className="flex-row items-center justify-between space-y-0">
          <DialogTitle>{t("editModalTitle") || "Edit Product"}</DialogTitle>
          {editPageUrl && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={editPageUrl} target="_blank">
                <ExternalLink className="mr-1.5 h-4 w-4" />
                {tModal("openInNewPage")}
              </Link>
            </Button>
          )}
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : product ? (
          <ProductForm
            mode="edit"
            productId={productId || ""}
            initialData={transformProductToFormData(product)}
            onSuccess={handleFormSuccess}
            onClose={onClose}
            embedded
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="text-muted-foreground h-12 w-12" />
            <p className="text-muted-foreground mt-2 text-sm">
              {tModal("notFound")}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});

export default ProductEditModal;
