"use client";

import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, History, Loader2, Search, TrendingUp, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

export interface SearchSuggestion {
  id: string;
  text: string;
  type: "product" | "category" | "brand" | "recent";
  metadata?: {
    productCount?: number;
    imageUrl?: string;
  };
}

export interface ProductSearchProps {
  onSearch: (query: string) => void;
  onSubmit?: (query: string) => void;
  placeholder?: string;
  defaultValue?: string;
  debounceDelay?: number;
  isLoading?: boolean;
  suggestions?: SearchSuggestion[];
  showSuggestions?: boolean;
  recentSearches?: string[];
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  onClearRecentSearches?: () => void;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export interface ProductSearchRef {
  focus: () => void;
  clear: () => void;
  setValue: (value: string) => void;
}

const RECENT_SEARCHES_KEY = "product_recent_searches";
const MAX_RECENT_SEARCHES = 5;

const SIZE_CLASSES = {
  sm: "h-9 text-sm",
  md: "h-10",
  lg: "h-12 text-lg",
};

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string): void {
  if (typeof window === "undefined" || !query.trim()) return;
  try {
    const recent = getRecentSearches();
    const filtered = recent.filter((s) => s.toLowerCase() !== query.toLowerCase());
    const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
}

function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // ignore storage errors
  }
}

const SuggestionItem = memo(function SuggestionItem({
  suggestion,
  onSelect,
}: {
  suggestion: SearchSuggestion;
  onSelect: (suggestion: SearchSuggestion) => void;
}) {
  const Icon = suggestion.type === "recent" ? History : TrendingUp;

  return (
    <CommandItem
      value={suggestion.text}
      onSelect={() => onSelect(suggestion)}
      className="group flex items-center gap-3 py-2"
    >
      <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{suggestion.text}</span>
      {suggestion.metadata?.productCount !== undefined && (
        <Badge variant="secondary" className="text-xs">
          {suggestion.metadata.productCount}
        </Badge>
      )}
      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </CommandItem>
  );
});

export const ProductSearch = forwardRef<ProductSearchRef, ProductSearchProps>(function ProductSearch(
  {
    onSearch,
    onSubmit,
    placeholder,
    defaultValue = "",
    debounceDelay = 300,
    isLoading = false,
    suggestions = [],
    showSuggestions = false,
    recentSearches: externalRecentSearches,
    onSuggestionSelect,
    onClearRecentSearches,
    size = "md",
    fullWidth = true,
    autoFocus = false,
    className,
  },
  ref
) {
  const t = useTranslations("products.search");
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const debouncedQuery = useDebounce(query, debounceDelay);

  useEffect(() => {
    if (!externalRecentSearches) {
      setRecentSearches(getRecentSearches());
    }
  }, [externalRecentSearches]);

  useEffect(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => {
      setQuery("");
      onSearch("");
    },
    setValue: (value: string) => setQuery(value),
  }));

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      if (showSuggestions && e.target.value) {
        setIsOpen(true);
      }
    },
    [showSuggestions]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    onSearch("");
    inputRef.current?.focus();
  }, [onSearch]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedQuery = query.trim();
      if (trimmedQuery) {
        saveRecentSearch(trimmedQuery);
        setRecentSearches(getRecentSearches());
        onSubmit?.(trimmedQuery);
        setIsOpen(false);
      }
    },
    [query, onSubmit]
  );

  const handleSuggestionSelect = useCallback(
    (suggestion: SearchSuggestion) => {
      setQuery(suggestion.text);
      saveRecentSearch(suggestion.text);
      setRecentSearches(getRecentSearches());
      onSuggestionSelect?.(suggestion);
      onSearch(suggestion.text);
      setIsOpen(false);
    },
    [onSearch, onSuggestionSelect]
  );

  const handleClearRecent = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
    onClearRecentSearches?.();
  }, [onClearRecentSearches]);

  const handleFocus = useCallback(() => {
    const displayRecentSearches = externalRecentSearches || recentSearches;
    if (showSuggestions && (query || displayRecentSearches.length > 0)) {
      setIsOpen(true);
    }
  }, [externalRecentSearches, query, recentSearches, showSuggestions]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }, []);

  const displayRecentSearches = externalRecentSearches || recentSearches;
  const hasContent = suggestions.length > 0 || displayRecentSearches.length > 0;

  if (!showSuggestions) {
    return (
      <form onSubmit={handleSubmit} className={cn(fullWidth && "w-full", className)}>
        <div className="relative">
          <Search
            className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground",
              size === "sm" && "h-4 w-4",
              size === "md" && "h-4 w-4",
              size === "lg" && "h-5 w-5"
            )}
          />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            placeholder={placeholder || t("placeholder")}
            autoFocus={autoFocus}
            className={cn("pl-10 pr-10", SIZE_CLASSES[size], fullWidth && "w-full")}
          />
          {isLoading && (
            <Loader2 className="absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
          {query && !isLoading && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={handleClear}
              aria-label={t("clear")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn(fullWidth && "w-full", className)}>
      <Popover open={isOpen && hasContent} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10",
                size === "sm" && "h-4 w-4",
                size === "md" && "h-4 w-4",
                size === "lg" && "h-5 w-5"
              )}
            />
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleChange}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || t("placeholder")}
              autoFocus={autoFocus}
              className={cn("pl-10 pr-10", SIZE_CLASSES[size], fullWidth && "w-full")}
            />
            {isLoading && (
              <Loader2 className="absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
            {query && !isLoading && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={handleClear}
                aria-label={t("clear")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </PopoverTrigger>

        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              {suggestions.length > 0 && (
                <CommandGroup heading={t("suggestions")}>
                  {suggestions.map((suggestion) => (
                    <SuggestionItem
                      key={suggestion.id}
                      suggestion={suggestion}
                      onSelect={handleSuggestionSelect}
                    />
                  ))}
                </CommandGroup>
              )}

              {suggestions.length > 0 && displayRecentSearches.length > 0 && <CommandSeparator />}

              {displayRecentSearches.length > 0 && (
                <CommandGroup
                  heading={
                    <div className="flex items-center justify-between">
                      <span>{t("recentSearches")}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                        onClick={handleClearRecent}
                        type="button"
                      >
                        {t("clearRecent")}
                      </Button>
                    </div>
                  }
                >
                  {displayRecentSearches.map((search, index) => (
                    <SuggestionItem
                      key={`recent-${index}`}
                      suggestion={{ id: `recent-${index}`, text: search, type: "recent" }}
                      onSelect={handleSuggestionSelect}
                    />
                  ))}
                </CommandGroup>
              )}

              {!suggestions.length && !displayRecentSearches.length && (
                <CommandEmpty>{t("noResults")}</CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </form>
  );
});

ProductSearch.displayName = "ProductSearch";

export default ProductSearch;
