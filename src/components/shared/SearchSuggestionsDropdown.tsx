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

// Subset of the /api/v1/products response shape we actually render. The
// endpoint returns much more (price, stock, shop, category, etc.) but the
// dropdown only needs id, name, and the first image.
type SuggestionProduct = {
  id: string;
  name: string;
  image: string | null;
};

// Raw shape from /api/v1/products list-handler.
type ProductsApiItem = {
  id: string;
  name: string;
  images?: string[] | null;
};

type ProductsApiResponse =
  | { success: true; data: ProductsApiItem[] }
  | { success: false; error: { message: string } };

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

const DROPDOWN_LIMIT = 8;

const SearchSuggestionsDropdownContent = React.forwardRef<
  SearchSuggestionsDropdownHandle,
  Props
>(({ query, open, onSelect, onClose: _onClose }: Props, ref) => {
  const t = useTranslations("search");
  const locale = useLocale();
  const debouncedQuery = useDebounce(query, 200);
  const [products, setProducts] = React.useState<SuggestionProduct[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    if (!open || debouncedQuery.length < 2) {
      setProducts([]);
      setActiveIndex(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setActiveIndex(null);

    // Call the same endpoint as the full search-results page so what the
    // dropdown shows is always a true preview of what pressing Enter brings
    // up. Limit to 8 to keep the dropdown short.
    const params = new URLSearchParams({
      q: debouncedQuery,
      locale,
      limit: String(DROPDOWN_LIMIT),
      page: "1",
    });

    fetch(`/api/v1/products?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => res.json() as Promise<ProductsApiResponse>)
      .then((json) => {
        if (!json || !("success" in json) || !json.success) {
          setProducts([]);
          return;
        }
        const mapped: SuggestionProduct[] = json.data.map((p) => ({
          id: p.id,
          name: p.name,
          image:
            Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
        }));
        setProducts(mapped);
        setActiveIndex(null);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setProducts([]);
        }
      })
      .finally(() => setLoading(false));

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, open, locale]);

  // Expose imperative handle for Header.tsx
  React.useImperativeHandle(
    ref,
    () => ({
      moveDown() {
        setActiveIndex((prev) => {
          if (products.length === 0) return null;
          if (prev === null) return 0;
          return (prev + 1) % products.length;
        });
      },
      moveUp() {
        setActiveIndex((prev) => {
          if (products.length === 0) return null;
          if (prev === null) return products.length - 1;
          return prev === 0 ? products.length - 1 : prev - 1;
        });
      },
      selectActive() {
        if (activeIndex !== null && activeIndex < products.length) {
          const product = products[activeIndex];
          onSelect("product", product.id, product.name);
          return true;
        }
        return false;
      },
      reset() {
        setActiveIndex(null);
      },
    }),
    [activeIndex, products, onSelect]
  );

  // With only 8 results max, grouping by category creates more noise than
  // signal and risks rendering a misleading heading when the API doesn't
  // return a category for a product. Show one flat "Products" group instead.
  const productsHeading = t("products");

  const hasResults = products.length > 0;
  const selectedValue =
    activeIndex !== null && activeIndex < products.length
      ? `product-${products[activeIndex].id}`
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
          {!loading && hasResults && (
            <CommandGroup heading={productsHeading}>
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
                    <div className="bg-muted mr-3 h-8 w-8 shrink-0 rounded" />
                  )}
                  <span className="truncate">{p.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </div>
  );
});

SearchSuggestionsDropdownContent.displayName = "SearchSuggestionsDropdown";

export const SearchSuggestionsDropdown = SearchSuggestionsDropdownContent;
