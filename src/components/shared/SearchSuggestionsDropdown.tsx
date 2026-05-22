"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Command,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";

type SuggestionProduct = {
  id: string;
  name: string;
  image: string | null;
  categoryId: string;
};

interface SuggestionsData {
  products: SuggestionProduct[];
}

interface Props {
  query: string;
  open: boolean;
  onSelect: (kind: "product", id: string, label: string) => void;
  onClose: () => void;
}

export interface SearchSuggestionsDropdownHandle {
  moveDown: () => void;
  moveUp: () => void;
  selectActive: () => boolean;
  reset: () => void;
}

const SearchSuggestionsDropdownContent = React.forwardRef<
  SearchSuggestionsDropdownHandle,
  Props
>(
  (
    {
      query,
      open,
      onSelect,
      onClose,
    }: Props,
    ref
  ) => {
    const t = useTranslations("search");
    const locale = useLocale();
    const debouncedQuery = useDebounce(query, 200);
    const [data, setData] = React.useState<SuggestionsData>({ products: [] });
    const [loading, setLoading] = React.useState(false);
    const [categories, setCategories] = React.useState<Record<string, string>>({});
    const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
    const abortRef = React.useRef<AbortController | null>(null);

    // Compute flat list of products for navigation
    const flatProducts = React.useMemo(() => {
      const flat: SuggestionProduct[] = [];
      data.products.forEach((p) => {
        flat.push(p);
      });
      return flat;
    }, [data.products]);

    // Fetch categories on mount for grouping
    React.useEffect(() => {
      const fetchCategories = async () => {
        try {
          const res = await fetch(`/api/v1/categories`);
          const json = await res.json();
          if (json?.data && Array.isArray(json.data)) {
            const categoryMap: Record<string, string> = {};
            json.data.forEach(
              (cat: { id: string; name_en: string; name_ru: string; name_am?: string }) => {
                const nameCol =
                  locale === "en" ? "name_en" : locale === "ru" ? "name_ru" : "name_am";
                categoryMap[cat.id] = cat[nameCol as keyof typeof cat] || cat.name_en;
              }
            );
            setCategories(categoryMap);
          }
        } catch (err) {
          console.error("Failed to fetch categories", err);
        }
      };
      fetchCategories();
    }, [locale]);

    React.useEffect(() => {
      if (!open || debouncedQuery.length < 2) {
        setData({ products: [] });
        setActiveIndex(null);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setActiveIndex(null);

      fetch(
        `/api/v1/products/suggestions?q=${encodeURIComponent(debouncedQuery)}&locale=${locale}`,
        { signal: controller.signal }
      )
        .then((res) => res.json())
        .then((json) => {
          if (json?.data) {
            setData(json.data);
            setActiveIndex(null);
          }
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            setData({ products: [] });
          }
        })
        .finally(() => setLoading(false));

      return () => {
        controller.abort();
      };
    }, [debouncedQuery, open, locale]);

    // Expose imperative handle for Header.tsx
    React.useImperativeHandle(ref, () => ({
      moveDown() {
        setActiveIndex((prev) => {
          if (flatProducts.length === 0) return null;
          if (prev === null) return 0;
          return (prev + 1) % flatProducts.length;
        });
      },
      moveUp() {
        setActiveIndex((prev) => {
          if (flatProducts.length === 0) return null;
          if (prev === null) return flatProducts.length - 1;
          return prev === 0 ? flatProducts.length - 1 : prev - 1;
        });
      },
      selectActive() {
        if (activeIndex !== null && activeIndex < flatProducts.length) {
          const product = flatProducts[activeIndex];
          onSelect("product", product.id, product.name);
          return true;
        }
        return false;
      },
      reset() {
        setActiveIndex(null);
      },
    }), [activeIndex, flatProducts, onSelect]);

    // Group products by category, filtering out products without a categoryId
    const groupedProducts = React.useMemo(() => {
      const groups: Record<string, SuggestionProduct[]> = {};
      data.products.forEach((p) => {
        if (!p.categoryId) return;
        if (!groups[p.categoryId]) {
          groups[p.categoryId] = [];
        }
        groups[p.categoryId].push(p);
      });
      return groups;
    }, [data.products]);

    const hasResults = data.products.length > 0;
    const selectedValue =
      activeIndex !== null && activeIndex < flatProducts.length
        ? `product-${flatProducts[activeIndex].id}`
        : "__none__";

    if (!open) return null;

    return (
      <div className="bg-popover absolute top-full left-0 z-50 w-full rounded-b-lg border shadow-md">
        <Command shouldFilter={false} value={selectedValue}>
          <CommandList className="max-h-96">
            {loading && (
              <div className="space-y-2 p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            )}
            {!loading && !hasResults && (
              <CommandEmpty>{t("noSuggestions")}</CommandEmpty>
            )}
            {!loading &&
              hasResults &&
              Object.entries(groupedProducts).map(([categoryId, products]) => (
                <CommandGroup
                  key={categoryId}
                  heading={categories[categoryId] || "Products"}
                >
                  {products.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={`product-${p.id}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onSelect={() => onSelect("product", p.id, p.name)}
                    >
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="mr-3 h-8 w-8 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="mr-3 h-8 w-8 shrink-0 rounded bg-muted" />
                      )}
                      <span className="truncate">{p.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
          </CommandList>
        </Command>
      </div>
    );
  }
);

SearchSuggestionsDropdownContent.displayName = "SearchSuggestionsDropdown";

export const SearchSuggestionsDropdown = SearchSuggestionsDropdownContent;
