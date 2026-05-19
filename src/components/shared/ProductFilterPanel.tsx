"use client";

import { memo, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { ProductCategory } from "@/hooks/use-product-search";

// ============================================================================
// Types
// ============================================================================

interface ProductFilterPanelProps {
  categories: ProductCategory[];
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  availableTags?: Array<{ id: string; name: string; key: string }>;
  selectedTagIds?: string[];
  onTagChange?: (value: string[]) => void;
  priceRange: [number, number];
  onPriceRangeChange: (value: [number, number]) => void;
  maxPrice: number;
  activeFiltersCount: number;
  onReset: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export const ProductFilterPanel = memo(function ProductFilterPanel({
  categories,
  selectedCategory,
  onCategoryChange,
  availableTags = [],
  selectedTagIds = [],
  onTagChange,
  priceRange,
  onPriceRangeChange,
  maxPrice,
  activeFiltersCount,
  onReset,
  className,
}: ProductFilterPanelProps) {
  const t = useTranslations("home.filters");

  const [minInput, setMinInput] = useState(String(priceRange[0]));
  const [maxInput, setMaxInput] = useState(String(priceRange[1]));

  useEffect(() => {
    setMinInput(String(priceRange[0]));
    setMaxInput(String(priceRange[1]));
  }, [priceRange]);

  const syncInputsFromSlider = (v: [number, number]) => {
    setMinInput(String(v[0]));
    setMaxInput(String(v[1]));
    onPriceRangeChange(v);
  };

  const commitMin = () => {
    const n = Math.max(0, Math.min(Number(minInput) || 0, priceRange[1]));
    setMinInput(String(n));
    onPriceRangeChange([n, priceRange[1]]);
  };

  const commitMax = () => {
    const n = Math.max(
      priceRange[0],
      Math.min(Number(maxInput) || 0, maxPrice)
    );
    setMaxInput(String(n));
    onPriceRangeChange([priceRange[0], n]);
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Category Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("category")}</label>
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder={t("allCategories")} />
            </SelectTrigger>
            <SelectContent className="max-h-[400px] overflow-y-auto">
              <SelectItem value="all">{t("allCategories")}</SelectItem>
              {categories.map((cat) => (
                <SelectItem
                  key={cat.id}
                  value={cat.id}
                  className={cat.type === "subcategory" ? "pl-6" : undefined}
                >
                  {cat.type === "subcategory" && (
                    <span className="text-muted-foreground mr-1">└─ </span>
                  )}
                  {cat.name}
                  {cat.productCount !== undefined && (
                    <span className="text-muted-foreground ml-2">
                      ({cat.productCount})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tag Filters */}
        {availableTags.length > 0 && onTagChange && (
          <div className="space-y-2 pt-2">
            <label className="text-sm font-medium">{t("tags")}</label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <Button
                    key={tag.id}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 text-xs transition-all"
                    onClick={() => {
                      const next = isSelected
                        ? selectedTagIds.filter((id) => id !== tag.id)
                        : [...selectedTagIds, tag.id];
                      onTagChange(next);
                    }}
                  >
                    {tag.name}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Price Range Filter */}
        <div className="space-y-5">
          <label className="text-sm font-medium">{t("priceRange")}</label>
          <Slider
            value={priceRange}
            onValueChange={(v) => syncInputsFromSlider(v as [number, number])}
            max={maxPrice}
            min={0}
            step={100}
          />
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type="number"
                value={minInput}
                onChange={(e) => setMinInput(e.target.value)}
                onBlur={commitMin}
                onKeyDown={(e) => e.key === "Enter" && commitMin()}
                min={0}
                max={priceRange[1]}
                className="h-8 pr-6 text-xs"
              />
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs">
                ֏
              </span>
            </div>
            <span className="text-muted-foreground text-xs">–</span>
            <div className="relative flex-1">
              <Input
                type="number"
                value={maxInput}
                onChange={(e) => setMaxInput(e.target.value)}
                onBlur={commitMax}
                onKeyDown={(e) => e.key === "Enter" && commitMax()}
                min={priceRange[0]}
                max={maxPrice}
                className="h-8 pr-6 text-xs"
              />
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs">
                ֏
              </span>
            </div>
          </div>
        </div>

        {/* Reset Button */}
        {activeFiltersCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              onReset();
              setMinInput("0");
              setMaxInput(String(maxPrice));
            }}
          >
            {t("reset")}
          </Button>
        )}
      </div>
    </div>
  );
});
