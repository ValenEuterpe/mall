"use client";

import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, ChevronUp, RotateCcw, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCategories, type Category, type Subcategory } from "@/hooks/use-categories";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ProductFiltersState {
  categoryId?: string;
  subcategoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  brands?: string[];
}

export interface ProductFiltersProps {
  /** Initial filter values */
  initialFilters?: ProductFiltersState;
  /** Called when filters change */
  onFilterChange: (filters: ProductFiltersState) => void;
  /** Price range bounds */
  priceRange?: {
    min: number;
    max: number;
    step?: number;
  };
  /** Available brands */
  brands?: string[];
  /** Show as sheet on mobile */
  mobileSheet?: boolean;
  /** Custom class name */
  className?: string;
  /** Debounce delay for slider changes */
  debounceDelay?: number;
}

interface FilterSectionProps {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PRICE_RANGE = {
  min: 0,
  max: 1000,
  step: 10,
};

// ============================================================================
// Sub-Components
// ============================================================================

const FilterSection = memo(function FilterSection({
  title,
  count,
  defaultOpen = true,
  children,
}: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between py-2",
            "text-sm font-medium hover:text-primary transition-colors"
          )}
        >
          <span className="flex items-center gap-2">
            {title}
            {count !== undefined && count > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {count}
              </Badge>
            )}
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
});

const CategoryItem = memo(function CategoryItem({
  category,
  isSelected,
  onSelect,
}: {
  category: Category;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
}) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={`category-${category.id}`}
        checked={isSelected}
        onCheckedChange={(checked) => onSelect(category.id, checked as boolean)}
      />
      <label
        htmlFor={`category-${category.id}`}
        className={cn(
          "flex-1 text-sm cursor-pointer transition-colors",
          "hover:text-primary",
          isSelected && "font-medium text-primary"
        )}
      >
        {category.name}
      </label>
      {category.productCount > 0 && (
        <span className="text-xs text-muted-foreground">({category.productCount})</span>
      )}
    </div>
  );
});

const SubcategoryItem = memo(function SubcategoryItem({
  subcategory,
  isSelected,
  onSelect,
}: {
  subcategory: Subcategory;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
}) {
  return (
    <div className="flex items-center space-x-2 pl-4">
      <Checkbox
        id={`subcategory-${subcategory.id}`}
        checked={isSelected}
        onCheckedChange={(checked) => onSelect(subcategory.id, checked as boolean)}
      />
      <label
        htmlFor={`subcategory-${subcategory.id}`}
        className={cn(
          "flex-1 text-sm cursor-pointer transition-colors",
          "hover:text-primary",
          isSelected && "font-medium text-primary"
        )}
      >
        {subcategory.name}
      </label>
    </div>
  );
});

interface PriceRangeSliderProps {
  value: [number, number];
  min: number;
  max: number;
  step: number;
  onChange: (value: [number, number]) => void;
}

const PriceRangeSlider = memo(function PriceRangeSlider({
  value,
  min,
  max,
  step,
  onChange,
}: PriceRangeSliderProps) {
  const t = useTranslations("products.filters");

  return (
    <div className="space-y-4">
      <div className="px-1">
        <Slider
          min={min}
          max={max}
          step={step}
          value={value}
          onValueChange={(val) => onChange(val as [number, number])}
          className="py-4"
        />
      </div>
      <div className="flex items-center justify-between text-sm">
        <div className="rounded-md border bg-muted px-3 py-1">${value[0]}</div>
        <span className="text-muted-foreground">{t("to")}</span>
        <div className="rounded-md border bg-muted px-3 py-1">${value[1]}</div>
      </div>
    </div>
  );
});

const ActiveFilters = memo(function ActiveFilters({
  filters,
  categories,
  onRemove,
  onClear,
}: {
  filters: ProductFiltersState;
  categories: Category[];
  onRemove: (key: keyof ProductFiltersState) => void;
  onClear: () => void;
}) {
  const t = useTranslations("products.filters");

  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.categoryId) count++;
    if (filters.subcategoryId) count++;
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count++;
    if (filters.inStock) count++;
    if (filters.brands?.length) count += filters.brands.length;
    return count;
  }, [filters]);

  if (activeCount === 0) return null;

  const selectedCategory = categories.find((c) => c.id === filters.categoryId);
  const selectedSubcategory = selectedCategory?.subcategories.find(
    (s) => s.id === filters.subcategoryId
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t("activeFilters", { count: activeCount })}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
          type="button"
        >
          {t("clearAll")}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {selectedCategory && (
          <Badge variant="secondary" className="gap-1">
            {selectedCategory.name}
            <button onClick={() => onRemove("categoryId")} className="ml-1" type="button">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {selectedSubcategory && (
          <Badge variant="secondary" className="gap-1">
            {selectedSubcategory.name}
            <button onClick={() => onRemove("subcategoryId")} className="ml-1" type="button">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
          <Badge variant="secondary" className="gap-1">
            ${filters.minPrice || 0} - ${filters.maxPrice || "∞"}
            <button
              onClick={() => {
                onRemove("minPrice");
                onRemove("maxPrice");
              }}
              className="ml-1"
              type="button"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {filters.inStock && (
          <Badge variant="secondary" className="gap-1">
            {t("inStockBadge")}
            <button onClick={() => onRemove("inStock")} className="ml-1" type="button">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
      </div>
    </div>
  );
});

function FiltersSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-5 w-20" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
      <Separator />
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Filter Content Component
// ============================================================================

interface FilterContentProps extends Omit<ProductFiltersProps, "mobileSheet"> {
  onApply?: () => void;
  showApplyButton?: boolean;
}

const FilterContent = memo(function FilterContent({
  initialFilters = {},
  onFilterChange,
  priceRange = DEFAULT_PRICE_RANGE,
  brands = [],
  className,
  debounceDelay = 300,
  onApply,
  showApplyButton = false,
}: FilterContentProps) {
  const t = useTranslations("products.filters");
  const { categories, isLoading: categoriesLoading } = useCategories();

  const [localFilters, setLocalFilters] = useState<ProductFiltersState>(initialFilters);
  const [priceValue, setPriceValue] = useState<[number, number]>([
    initialFilters.minPrice ?? priceRange.min,
    initialFilters.maxPrice ?? priceRange.max,
  ]);

  const debouncedPrice = useDebounce(priceValue, debounceDelay);

  useEffect(() => {
    setLocalFilters((prev) => ({
      ...prev,
      minPrice: debouncedPrice[0] === priceRange.min ? undefined : debouncedPrice[0],
      maxPrice: debouncedPrice[1] === priceRange.max ? undefined : debouncedPrice[1],
    }));
  }, [debouncedPrice, priceRange.min, priceRange.max]);

  const handleCategoryChange = useCallback((categoryId: string, selected: boolean) => {
    setLocalFilters((prev) => ({
      ...prev,
      categoryId: selected ? categoryId : undefined,
      subcategoryId: undefined,
    }));
  }, []);

  const handleSubcategoryChange = useCallback((subcategoryId: string, selected: boolean) => {
    setLocalFilters((prev) => ({
      ...prev,
      subcategoryId: selected ? subcategoryId : undefined,
    }));
  }, []);

  const handleInStockChange = useCallback((checked: boolean) => {
    setLocalFilters((prev) => ({
      ...prev,
      inStock: checked || undefined,
    }));
  }, []);

  const handleApply = useCallback(() => {
    onFilterChange(localFilters);
    onApply?.();
  }, [localFilters, onFilterChange, onApply]);

  const handleReset = useCallback(() => {
    const emptyFilters: ProductFiltersState = {};
    setLocalFilters(emptyFilters);
    setPriceValue([priceRange.min, priceRange.max]);
    onFilterChange(emptyFilters);
  }, [priceRange.min, priceRange.max, onFilterChange]);

  const handleRemoveFilter = useCallback((key: keyof ProductFiltersState) => {
    setLocalFilters((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  }, []);

  useEffect(() => {
    if (!showApplyButton) {
      onFilterChange(localFilters);
    }
  }, [localFilters, showApplyButton, onFilterChange]);

  return (
    <div className={cn("space-y-6", className)}>
      <ActiveFilters
        filters={localFilters}
        categories={categories}
        onRemove={handleRemoveFilter}
        onClear={handleReset}
      />

      <FilterSection title={t("category")} count={localFilters.categoryId ? 1 : 0}>
        {categoriesLoading ? (
          <FiltersSkeleton />
        ) : (
          <ScrollArea className="h-48 pr-4">
            <div className="space-y-3">
              {categories.map((category) => (
                <div key={category.id} className="space-y-2">
                  <CategoryItem
                    category={category}
                    isSelected={localFilters.categoryId === category.id}
                    onSelect={handleCategoryChange}
                  />

                  {localFilters.categoryId === category.id && category.subcategories.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {category.subcategories.map((sub) => (
                        <SubcategoryItem
                          key={sub.id}
                          subcategory={sub}
                          isSelected={localFilters.subcategoryId === sub.id}
                          onSelect={handleSubcategoryChange}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </FilterSection>

      <Separator />

      <FilterSection
        title={t("priceRange")}
        count={priceValue[0] !== priceRange.min || priceValue[1] !== priceRange.max ? 1 : 0}
      >
        <PriceRangeSlider
          value={priceValue}
          min={priceRange.min}
          max={priceRange.max}
          step={priceRange.step || 10}
          onChange={setPriceValue}
        />
      </FilterSection>

      <Separator />

      <FilterSection title={t("availability")}>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="inStock"
            checked={localFilters.inStock || false}
            onCheckedChange={(checked) => handleInStockChange(checked as boolean)}
          />
          <label
            htmlFor="inStock"
            className="text-sm cursor-pointer hover:text-primary transition-colors"
          >
            {t("inStockOnly")}
          </label>
        </div>
      </FilterSection>

      {brands.length > 0 && (
        <>
          <Separator />
          <FilterSection title={t("brands")} count={localFilters.brands?.length}>
            <ScrollArea className="h-32 pr-4">
              <div className="space-y-2">
                {brands.map((brand) => (
                  <div key={brand} className="flex items-center space-x-2">
                    <Checkbox
                      id={`brand-${brand}`}
                      checked={localFilters.brands?.includes(brand) || false}
                      onCheckedChange={(checked) => {
                        setLocalFilters((prev) => ({
                          ...prev,
                          brands: checked
                            ? [...(prev.brands || []), brand]
                            : prev.brands?.filter((b) => b !== brand),
                        }));
                      }}
                    />
                    <label htmlFor={`brand-${brand}`} className="text-sm cursor-pointer">
                      {brand}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </FilterSection>
        </>
      )}

      {showApplyButton && (
        <>
          <Separator />
          <div className="flex gap-2">
            <Button onClick={handleApply} className="flex-1">
              <Check className="mr-2 h-4 w-4" />
              {t("apply")}
            </Button>
            <Button onClick={handleReset} variant="outline" type="button">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
});

// ============================================================================
// Main Component with Desktop/Mobile Support
// ============================================================================

export function ProductFilters({ mobileSheet = true, className, ...props }: ProductFiltersProps) {
  const t = useTranslations("products.filters");
  const [isOpen, setIsOpen] = useState(false);

  const desktopFilters = (
    <Card className={cn("hidden lg:block", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <SlidersHorizontal className="h-5 w-5" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <FilterContent {...props} />
      </CardContent>
    </Card>
  );

  const mobileFilters = mobileSheet ? (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="lg:hidden" type="button">
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          {t("title")}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            {t("title")}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] py-4">
          <FilterContent {...props} showApplyButton onApply={() => setIsOpen(false)} />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  ) : null;

  return (
    <>
      {desktopFilters}
      {mobileFilters}
    </>
  );
}

export default ProductFilters;
