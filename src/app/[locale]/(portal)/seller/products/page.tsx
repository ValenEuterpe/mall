"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Loader2, Package } from "lucide-react";

import {
  apiClient,
  type ApiResponse,
  type PaginationMeta,
} from "@/lib/api-client";
import { useRequireRole } from "@/hooks/use-auth";
import { Link } from "@/i18n/routing";
import { toast } from "@/lib/utils/toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SellerProductCard,
  SellerProductCardSkeleton,
  ProductEditModal,
} from "@/components/seller";
import { ProductDetailModal } from "@/components/products/ProductDetailModal";

type SellerProductListItem = {
  id: string;
  name: string;
  description?: string | null;
  images: string[];
  pricing: { basePrice: number };
  inventory: {
    stockQuantity: number;
    sku: string | null;
    barcode: string | null;
  };
  status: string;
  isActive: boolean;
  timestamps: { updatedAt: string | Date | null };
  discounts?: Array<{
    id: string;
    name: string;
    name_en?: string | null;
    name_ru?: string | null;
    name_am?: string | null;
    discountType: "percentage" | "fixed";
    discountValue: number;
    startDate: string | null;
    endDate: string | null;
    isActive: boolean;
  }>;
  category: null | {
    id: string;
    name: { en: string | null; ru: string | null };
  };
  subcategory: null | {
    id: string;
    name: { en: string | null; ru: string | null };
  };
};

function isSuccess<T>(
  res: ApiResponse<T>
): res is { success: true; data: T; meta?: PaginationMeta } {
  return res?.success === true;
}

export default function SellerProductsPage(): React.ReactElement {
  const t = useTranslations("portal.sellerProducts");
  const tSeller = useTranslations("seller.products");
  const { isAuthorized, isLoading: isAuthLoading } = useRequireRole(
    "SELLER",
    "/unauthorized"
  );

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(12);

  const [items, setItems] = useState<SellerProductListItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await apiClient.get<SellerProductListItem[]>(
        "/sellers/products",
        {
          q: q || undefined,
          page: 1,
          limit,
          sort: "lastUpdated:desc",
        }
      );

      if (isSuccess(res)) {
        setItems(res.data);
        setMeta(res.meta ?? null);
        setPage(1);
      }
    } catch (e: any) {
      setError(e?.message ?? t("errors.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [limit, q, t]);

  const loadMore = useCallback(async () => {
    if (!meta?.hasMore || isLoadingMore) return;

    const nextPage = page + 1;
    setIsLoadingMore(true);

    try {
      const res = await apiClient.get<SellerProductListItem[]>(
        "/sellers/products",
        {
          q: q || undefined,
          page: nextPage,
          limit,
          sort: "lastUpdated:desc",
        }
      );

      if (isSuccess(res)) {
        setItems((prev) => [...prev, ...res.data]);
        setMeta(res.meta ?? null);
        setPage(nextPage);
      }
    } catch (e: any) {
      toast.error(e?.message ?? t("errors.loadFailed"));
    } finally {
      setIsLoadingMore(false);
    }
  }, [limit, meta?.hasMore, isLoadingMore, page, q, t]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] =
    useState<SellerProductListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const handleDeleteClick = (product: SellerProductListItem) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    setIsDeleting(true);
    try {
      const res = await apiClient.delete(
        `/sellers/products/${productToDelete.id}`
      );
      if (res.success) {
        toast.success(tSeller("deleteSuccess"));
        setItems((prev) => prev.filter((p) => p.id !== productToDelete.id));
        setMeta((prev) => (prev ? { ...prev, total: prev.total - 1 } : null));
      } else {
        toast.error(tSeller("deleteFailed"));
      }
    } catch (e: any) {
      toast.error(e?.message || tSeller("deleteFailed"));
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const handleShowDetails = useCallback((productId: string) => {
    setSelectedProductId(productId);
    setDetailModalOpen(true);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedProductId(null);
  }, []);

  const handleEditProduct = useCallback((productId: string) => {
    setEditingProductId(productId);
    setEditModalOpen(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setEditModalOpen(false);
    setEditingProductId(null);
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    void fetchProducts();
  }, [fetchProducts, isAuthorized]);

  useEffect(() => {
    if (!meta?.hasMore || isLoadingMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);
    return () => observer.disconnect();
  }, [meta?.hasMore, isLoadingMore, isLoading, loadMore]);

  const headerActions = useMemo(() => {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/seller/products/import">{t("actions.import")}</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/seller/products/export">{t("actions.export")}</Link>
          </Button>
          <Button asChild>
            <Link href="/seller/products/new">
              <Plus className="mr-2 h-4 w-4" />
              {tSeller("addProduct")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }, [t, tSeller]);

  if (isAuthLoading) return <div className="p-6">{t("loading")}</div>;
  if (!isAuthorized) return <></>;

  return (
    <div className="container mx-auto max-w-6xl space-y-4 py-6">
      {headerActions}

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">{t("filters.title")}</CardTitle>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
              }}
              placeholder={t("filters.searchPlaceholder")}
              className="sm:w-[280px]"
            />
            <Button onClick={fetchProducts} disabled={isLoading}>
              {t("actions.refresh")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-destructive mb-4 text-sm">{error}</p>
          ) : null}

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SellerProductCardSkeleton key={i} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="text-muted-foreground/50 h-12 w-12" />
              <h3 className="mt-4 text-lg font-semibold">{t("empty")}</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("emptyDescription")}
              </p>
              <Button asChild className="mt-4">
                <Link href="/seller/products/new">
                  <Plus className="mr-2 h-4 w-4" />
                  {tSeller("addProduct")}
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => (
                  <SellerProductCard
                    key={p.id}
                    product={{
                      id: p.id,
                      name: p.name,
                      description: p.description,
                      basePrice: p.pricing.basePrice,
                      stockQuantity: p.inventory.stockQuantity,
                      images: p.images,
                      isActive: p.isActive,
                      status: p.status,
                      sku: p.inventory.sku ?? undefined,
                      discounts: p.discounts,
                      category: p.category,
                      subcategory: p.subcategory,
                    }}
                    onShowDetails={() => handleShowDetails(p.id)}
                    onEdit={() => handleEditProduct(p.id)}
                  />
                ))}
              </div>
              {meta?.hasMore && (
                <div
                  ref={sentinelRef}
                  className="mt-4 flex justify-center py-4"
                >
                  {isLoadingMore && (
                    <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tSeller("deleteDialog.title")}</DialogTitle>
            <DialogDescription>
              {tSeller("deleteDialog.description", {
                name: productToDelete?.name || "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              {tSeller("deleteDialog.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tSeller("deleteDialog.deleting")}
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {tSeller("deleteDialog.confirm")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Detail Modal */}
      <ProductDetailModal
        productId={selectedProductId}
        isOpen={detailModalOpen}
        onClose={handleCloseDetailModal}
        context="seller"
        onEdit={() => {
          if (selectedProductId) {
            handleEditProduct(selectedProductId);
            handleCloseDetailModal();
          }
        }}
      />

      {/* Product Edit Modal */}
      <ProductEditModal
        productId={editingProductId}
        isOpen={editModalOpen}
        onClose={handleCloseEditModal}
        onSaved={() => {
          handleCloseEditModal();
          void fetchProducts();
        }}
        onDelete={() => {
          const id = editingProductId;
          const p = id ? items.find((i) => i.id === id) : null;
          handleCloseEditModal();
          if (p) handleDeleteClick(p);
        }}
      />
    </div>
  );
}
