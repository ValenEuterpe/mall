"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2 } from "lucide-react";

import {
  ProductForm,
  type ProductFormData,
} from "@/components/seller/ProductForm";
import { DeleteProductDialog } from "@/components/seller";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/routing";
import { apiClient } from "@/lib/api-client";

export default function EditProductPage() {
  const t = useTranslations("seller.products");
  const tForm = useTranslations("seller.productForm");
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [initialData, setInitialData] =
    useState<Partial<ProductFormData> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
          tagIds?: string[];
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
            tagIds: product.tagIds || [],
            images: product.images || [],
            isActive: product.isActive,
            status: (product.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT") as
              | "DRAFT"
              | "PUBLISHED",
          });
        } else {
          setError(t("form.loadError"));
        }
      } catch {
        setError(t("form.loadError"));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchProduct();
  }, [productId, t]);

  if (isLoading) {
    return (
      <div className="container mx-auto flex min-h-[400px] items-center justify-center py-6">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !initialData) {
    return (
      <div className="text-destructive container mx-auto py-8 text-center">
        {error || t("form.notFound")}
      </div>
    );
  }

  const goBackToList = () => router.push("/seller/products");

  return (
    <div className="relative container mx-auto max-w-5xl px-4 py-8">
      <div className="bg-background/90 sticky top-0 z-40 -mx-4 mb-4 border-b px-4 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            asChild
            className="hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <Link href="/seller/products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {tForm("back")}
            </Link>
          </Button>
          <h1 className="from-primary to-primary/60 bg-gradient-to-r bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            {tForm("editTitle")}
          </h1>
        </div>
      </div>

      <ProductForm
        mode="edit"
        productId={productId}
        initialData={initialData}
        embedded
        onClose={goBackToList}
        onDelete={() => setDeleteOpen(true)}
        onSuccess={goBackToList}
      />

      <DeleteProductDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        product={{ id: productId, name: initialData.name || "" }}
        onDeleted={goBackToList}
      />
    </div>
  );
}
