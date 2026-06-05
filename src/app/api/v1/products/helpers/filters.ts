import { Prisma } from "@/prisma/generated/client";
import { buildPriceRangeFilter } from "@/lib/utils/search";
import { isValidId } from "./ids";

interface ProductFilters {
  categoryId?: string;
  subcategoryId?: string;
  shopId?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
  isFeatured?: string;
  brand?: string;
  tagIds?: string;
}

export function parseProductFilters(
  searchParams: URLSearchParams
): ProductFilters {
  return {
    categoryId: searchParams.get("categoryId") ?? undefined,
    subcategoryId: searchParams.get("subcategoryId") ?? undefined,
    shopId: searchParams.get("shopId") ?? undefined,
    minPrice: searchParams.get("minPrice") ?? undefined,
    maxPrice: searchParams.get("maxPrice") ?? undefined,
    inStock: searchParams.get("inStock") ?? undefined,
    isFeatured: searchParams.get("isFeatured") ?? undefined,
    brand: searchParams.get("brand") ?? undefined,
    tagIds: searchParams.get("tagIds") ?? undefined,
  };
}

export function buildFilterConditions(
  filters: ProductFilters
): Prisma.ProductWhereInput {
  const conditions: Prisma.ProductWhereInput = {};

  // Category filter
  if (filters.categoryId && isValidId(filters.categoryId)) {
    conditions.categoryId = filters.categoryId;
  }

  // Subcategory filter
  if (filters.subcategoryId && isValidId(filters.subcategoryId)) {
    conditions.subcategoryId = filters.subcategoryId;
  }

  // Shop filter
  if (filters.shopId && isValidId(filters.shopId)) {
    conditions.shopId = filters.shopId;
  }

  // Brand filter
  if (filters.brand) {
    conditions.brand = {
      equals: filters.brand,
      mode: "insensitive",
    };
  }

  // Tag filter
  if (filters.tagIds) {
    const tagIdArray = filters.tagIds.split(",").filter((id) => isValidId(id));
    if (tagIdArray.length > 0) {
      conditions.productTags = {
        some: {
          tagId: { in: tagIdArray },
        },
      };
    }
  }

  // Price range filter
  const priceFilter = buildPriceRangeFilter(
    filters.minPrice,
    filters.maxPrice,
    "basePrice"
  );
  if (Object.keys(priceFilter).length > 0) {
    Object.assign(conditions, priceFilter);
  }

  // Stock filter
  if (filters.inStock === "true") {
    conditions.stockQuantity = { gt: 0 };
  } else if (filters.inStock === "false") {
    conditions.stockQuantity = { equals: 0 };
  }

  // Featured filter
  if (filters.isFeatured === "true") {
    conditions.isFeatured = true;
  }

  return conditions;
}
