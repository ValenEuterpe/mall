export const SEARCHABLE_FIELDS = ["name", "description", "brand", "sku"] as const;

export const SORTABLE_FIELDS = [
    "createdAt",
    "updatedAt",
    "name",
    "basePrice",
    "stockQuantity",
    "viewCount",
] as const;

export const DEFAULT_SORT = {
    field: "createdAt",
    order: "desc" as const,
};