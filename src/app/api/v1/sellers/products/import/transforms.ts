import { ProductStatus } from "@/prisma/generated/client";
import { ProcessedProduct } from "./types";
import { VALID_STATUSES } from "./constants";

/**
 * Normalizes a numeric identifier (barcode, SKU) that may arrive
 * in scientific notation from Excel (e.g. "4.85E+12" or "4,85E+12").
 * Converts to the full integer string representation.
 */
function normalizeNumericCode(value: unknown): string | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;

  // Handle scientific notation: 4.85E+12, 4,85E+12, 4.85e12, etc.
  const normalized = str.replace(",", ".");
  if (/^[\d.]+[eE][+]?\d+$/.test(normalized)) {
    const num = Number(normalized);
    if (!isNaN(num) && Number.isFinite(num)) {
      return num.toFixed(0);
    }
  }

  return str;
}

export function transformRowToProduct(
  row: Record<string, unknown>,
  categoryMap: Map<string, string>
): ProcessedProduct {
  // Extract values with fallbacks for different header names
  const name = String(row.name || "").trim();
  const description = row.description ? String(row.description).trim() : null;

  const priceValue = row.price ?? row.basePrice ?? 0;
  const basePrice = parseFloat(String(priceValue)) || 0;

  const stockValue = row.stock ?? row.quantity ?? row.stockQuantity ?? 0;
  const stockQuantity = Math.max(0, parseInt(String(stockValue)) || 0);

  const brand = row.brand ? String(row.brand).trim() : null;
  const barcode = normalizeNumericCode(row.barcode);
  const sku = normalizeNumericCode(row.sku);

  // Map category name to ID
  const categoryName = row.category
    ? String(row.category).trim().toLowerCase()
    : null;
  const categoryKey =
    categoryName && categoryMap.has(categoryName)
      ? categoryMap.get(categoryName)!
      : null;

  // Parse status
  const rawStatus = row.status
    ? String(row.status).trim().toUpperCase()
    : "DRAFT";
  const status = VALID_STATUSES.has(rawStatus as ProductStatus)
    ? (rawStatus as ProductStatus)
    : ProductStatus.DRAFT;

  return {
    name,
    description,
    basePrice,
    stockQuantity,
    brand,
    barcode,
    sku,
    categoryKey,
    status,
  };
}
