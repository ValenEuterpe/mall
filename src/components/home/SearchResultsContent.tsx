"use client";

import { useTranslations } from "next-intl";
import { Loader2, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UserProductCard } from "@/components/products";
import type { ProductSearchItem } from "@/hooks/use-product-search";

interface SearchResultsContentProps {
  products: ProductSearchItem[];
  totalProducts: number;
  productsLoading: boolean;
  hasMore: boolean;
  page: number;
  onLoadMore: () => void;
  onResetFilters: () => void;
  onViewProduct: (productId: string) => void;
  onAddToMap: (product: ProductSearchItem) => void;
  onRemoveFromMap: (productId: string) => void;
  isSelected: (productId: string) => boolean;
  isFavorite: (productId: string) => boolean;
  onToggleFavorite: (productId: string) => void;
}

export function SearchResultsContent({
  products,
  totalProducts,
  productsLoading,
  hasMore,
  page,
  onLoadMore,
  onResetFilters,
  onViewProduct,
  onAddToMap,
  onRemoveFromMap,
  isSelected,
  isFavorite,
  onToggleFavorite,
}: SearchResultsContentProps): React.ReactElement {
  const t = useTranslations("home");
  const tProducts = useTranslations("home.products");

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Results Count */}
      <div className="px-4 py-2">
        <p className="text-muted-foreground text-sm">
          {productsLoading && page === 1
            ? tProducts("loading")
            : tProducts("resultsCount", { count: totalProducts })}
        </p>
      </div>

      {/* Products Grid */}
      <div className="p-4">
          {productsLoading && page === 1 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-muted aspect-square animate-pulse rounded-md"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingBag className="text-muted-foreground/50 h-12 w-12" />
              <h3 className="mt-4 text-lg font-semibold">
                {tProducts("noResults")}
              </h3>
              <p className="text-muted-foreground mt-1 text-sm">
                {tProducts("tryDifferentSearch")}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={onResetFilters}
              >
                {t("filters.reset")}
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]">
                {products.map((product) => (
                  <UserProductCard
                    key={product.id}
                    product={{
                      id: product.id,
                      name: product.name,
                      basePrice: product.basePrice,
                      effectivePrice: product.effectivePrice,
                      hasDiscount: product.hasDiscount,
                      discount: product.discount,
                      stockQuantity: product.stockQuantity,
                      images: product.images,
                      shop: product.shop
                        ? {
                            id: product.shop.id,
                            fullCode: product.shop.code,
                            shopName: product.shop.name,
                            businessName: product.shop.businessName,
                            svgId: product.shop.svgId,
                          }
                        : undefined,
                      category: product.category,
                    }}
                    isInCart={isSelected(product.id)}
                    isFavorite={isFavorite(product.id)}
                    onToggleFavorite={() => onToggleFavorite(product.id)}
                    onAddToMap={() => onAddToMap(product)}
                    onRemoveFromMap={() => onRemoveFromMap(product.id)}
                    onShowDetails={() => onViewProduct(product.id)}
                    showShopInfo
                  />
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={onLoadMore}
                    disabled={productsLoading}
                  >
                    {productsLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {tProducts("loadMore")}
                  </Button>
                </div>
              )}
            </>
          )}
      </div>
    </div>
  );
}
