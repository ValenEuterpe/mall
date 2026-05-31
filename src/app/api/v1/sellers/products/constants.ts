import { ProductStatus } from "@/prisma/generated/client";

/** Searchable fields for seller's products */
export const SEARCHABLE_FIELDS = [
  "name",
  "description",
  "brand",
  "sku",
  "barcode",
] as const;

/** Sortable fields for seller's products */
export const SORTABLE_FIELDS = [
  "createdAt",
  "updatedAt",
  "lastUpdated",
  "name",
  "basePrice",
  "stockQuantity",
  "status",
] as const;

/** Default sort configuration */
export const DEFAULT_SORT = {
  field: "lastUpdated",
  order: "desc" as const,
};

/** Valid product statuses */
export const VALID_STATUSES = Object.values(ProductStatus);
