/** Searchable fields for shops */
export const SEARCHABLE_FIELDS = [
  "fullCode",
  "shopName",
  "shopNumber",
] as const;

/** Sortable fields for shops */
export const SORTABLE_FIELDS = [
  "fullCode",
  "shopName",
  "createdAt",
  "updatedAt",
  "venue",
  "building",
  "floor",
] as const;

/** Default sort configuration */
export const DEFAULT_SORT = {
  field: "fullCode",
  order: "asc" as const,
};
