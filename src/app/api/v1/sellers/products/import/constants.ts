import { ProductStatus } from "@/prisma/generated/client";

/** Required columns in the import file */
export const REQUIRED_HEADERS = ["name"];

/** Optional columns that will be processed */
export const OPTIONAL_HEADERS = [
  "description",
  "price",
  "stock",
  "brand",
  "barcode",
  "sku",
  "category",
  "status",
];

/** Maximum rows per import */
export const MAX_IMPORT_ROWS = 1000;

/** Maximum file size (5MB) */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Batch size for database operations */
export const BATCH_SIZE = 50;

/** Valid product statuses for import */
export const VALID_STATUSES = new Set(Object.values(ProductStatus));
