"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ShoppingBag, ArrowRight, Tag, ChevronDown } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { UserProductCard } from "@/components/products";
import type {
  ProductSearchItem,
  ProductCategory,
} from "@/hooks/use-product-search";

interface HomeLandingContentProps {
  categories: ProductCategory[];
  selectedCategory: string;
  products: ProductSearchItem[];
  productsLoading: boolean;
  onCategoryClick: (categoryId: string) => void;
  onClearCategory: () => void;
  onViewProduct: (productId: string) => void;
  onAddToMap: (product: ProductSearchItem) => void;
  onRemoveFromMap: (productId: string) => void;
  isSelected: (productId: string) => boolean;
  isFavorite: (productId: string) => boolean;
  onToggleFavorite: (productId: string) => void;
}

export function HomeLandingContent({
  categories,
  selectedCategory,
  products,
  productsLoading,
  onCategoryClick,
  onClearCategory,
  onViewProduct,
  onAddToMap,
  onRemoveFromMap,
  isSelected,
  isFavorite,
  onToggleFavorite,
}: HomeLandingContentProps): React.ReactElement {
  const t = useTranslations("home");

  const topLevel = useMemo(
    () => categories.filter((c) => c.type !== "subcategory"),
    [categories]
  );

  const subcategoriesByParent = useMemo(() => {
    const map = new Map<string, ProductCategory[]>();
    for (const c of categories) {
      if (c.type === "subcategory" && c.parentId) {
        const list = map.get(c.parentId) ?? [];
        list.push(c);
        map.set(c.parentId, list);
      }
    }
    return map;
  }, [categories]);

  const selectedTopLevelId = useMemo(() => {
    if (!selectedCategory || selectedCategory === "all") return null;
    const sel = categories.find((c) => c.id === selectedCategory);
    if (!sel) return null;
    if (sel.type === "subcategory") return sel.parentId ?? null;
    return sel.id;
  }, [categories, selectedCategory]);

  const handleTopLevelClick = (id: string) => {
    if (selectedTopLevelId === id) {
      onClearCategory();
    } else {
      onCategoryClick(id);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Hero Banner */}
        <section className="mb-8">
          <div className="bg-primary/5 rounded-2xl p-8 sm:p-12">
            <p className="text-muted-foreground mb-2 text-sm font-medium">
              {t("hero.badge")}
            </p>
            <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
              {t("hero.titleStart")}{" "}
              <span className="text-primary">{t("hero.titleHighlight")}</span>
            </h1>
            <p className="text-muted-foreground mt-3 max-w-lg text-lg">
              {t("hero.description")}
            </p>
            <Button className="mt-6" size="lg">
              {t("hero.primaryCta")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>

        {/* Categories */}
        {topLevel.length > 0 && (
          <section className="mb-10">
            <h2 className="text-foreground mb-4 text-lg font-semibold">
              {t("browseCategories")}
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {topLevel.map((cat) => {
                const isExpanded = selectedTopLevelId === cat.id;
                const subs = subcategoriesByParent.get(cat.id) ?? [];
                return (
                  <div key={cat.id} className="space-y-2">
                    <button
                      onClick={() => handleTopLevelClick(cat.id)}
                      aria-expanded={isExpanded}
                      aria-pressed={isExpanded}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                        isExpanded
                          ? "border-primary bg-primary/5"
                          : "bg-card hover:border-primary/50"
                      }`}
                    >
                      <div className="bg-muted flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                        {cat.icon ? (
                          <Image
                            src={cat.icon}
                            alt=""
                            width={48}
                            height={48}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Tag className="text-muted-foreground h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-foreground truncate text-sm font-medium">
                          {cat.name}
                        </div>
                        {cat.productCount != null && (
                          <div className="text-muted-foreground mt-0.5 text-xs">
                            {t("products.count", { count: cat.productCount })}
                          </div>
                        )}
                      </div>
                      <ChevronDown
                        className={`text-muted-foreground h-4 w-4 shrink-0 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isExpanded && (
                      <div className="bg-muted/30 space-y-1 rounded-lg border p-2">
                        {subs.length === 0 ? (
                          <p className="text-muted-foreground px-3 py-1 text-xs">
                            {t("noSubcategories")}
                          </p>
                        ) : (
                          subs.map((sub) => {
                            const subSelected = selectedCategory === sub.id;
                            return (
                              <button
                                key={sub.id}
                                onClick={() =>
                                  subSelected
                                    ? onCategoryClick(cat.id)
                                    : onCategoryClick(sub.id)
                                }
                                aria-pressed={subSelected}
                                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                                  subSelected
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "hover:bg-background"
                                }`}
                              >
                                <span>{sub.name}</span>
                                {sub.productCount != null && (
                                  <span className="text-muted-foreground text-xs">
                                    {sub.productCount}
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Trending Products */}
        <section className="pb-8">
          <h2 className="text-foreground mb-4 text-lg font-semibold">
            {t("trendingProducts")}
          </h2>

          {productsLoading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-muted aspect-square animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingBag className="text-muted-foreground/50 h-12 w-12" />
              <p className="text-muted-foreground mt-4 text-sm">
                {t("products.noResults")}
              </p>
            </div>
          ) : (
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
          )}
        </section>
    </div>
  );
}
