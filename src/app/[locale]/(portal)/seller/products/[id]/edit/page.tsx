"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { ProductForm, type ProductFormData } from "@/components/seller/ProductForm";
import { apiClient } from "@/lib/api-client";

export default function EditProductPage() {
  const t = useTranslations("seller.products");
  const params = useParams();
  const productId = params.id as string;

  const [initialData, setInitialData] = useState<Partial<ProductFormData> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await apiClient.get<{
          id: string;
          name: string;
          name_en: string | null;
          name_ru: string | null;
          name_am: string | null;
          description: string | null;
          description_en: string | null;
          description_ru: string | null;
          description_am: string | null;
          basePrice: number;
          stockQuantity: number;
          sku: string | null;
          barcode: string | null;
          categoryId: string | null;
          subcategoryId: string | null;
          images: string[];
          isActive: boolean;
          status: string;
        }>(`/sellers/products/${productId}`);

        if (response.success && response.data) {
          const product = response.data;
          setInitialData({
            name: product.name || "",
            name_en: product.name_en || "",
            name_ru: product.name_ru || "",
            name_am: product.name_am || "",
            description: product.description || "",
            description_en: product.description_en || "",
            description_ru: product.description_ru || "",
            description_am: product.description_am || "",
            price: String(product.basePrice || 0),
            stockQuantity: String(product.stockQuantity || 0),
            sku: product.sku || "",
            barcode: product.barcode || "",
            categoryId: product.categoryId || "",
            subcategoryId: product.subcategoryId || "",
            images: product.images || [],
            isActive: product.isActive,
            status: (product.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT") as "DRAFT" | "PUBLISHED",
          });
        } else {
          setError(t("form.loadError"));
        }
      } catch (e) {
        setError(t("form.loadError"));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchProduct();
  }, [productId, t]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !initialData) {
    return (
      <div className="container mx-auto py-6 text-center py-8 text-destructive">
        {error || t("form.notFound")}
      </div>
    );
  }

  return <ProductForm mode="edit" initialData={initialData} productId={productId} />;
}
