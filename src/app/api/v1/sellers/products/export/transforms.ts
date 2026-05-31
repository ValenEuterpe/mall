import { Prisma } from "@/prisma/generated/client";

import type { ExportedProduct, ExportOptions } from "./types";
import { EXPORT_SELECT } from "./selects";
import { formatDate } from "./utils/format-date";

export function transformProductForExport(
  product: Prisma.ProductGetPayload<{ select: typeof EXPORT_SELECT }>,
  options: ExportOptions
): ExportedProduct {
  const exportedProduct: ExportedProduct = {
    Name: product.name,
    Description: product.description || "",
    Price: Number(product.basePrice),
    // NOTE: `Product` does not have `salePrice`; discounts are modeled separately.
    "Sale Price": "",
    Stock: product.stockQuantity,
    SKU: product.sku || "",
    Barcode: product.barcode || "",
    Brand: product.brand || "",
    Category: product.category?.name_en || "",
    Subcategory: product.subcategory?.name_en || "",
    Status: product.status,
    Active: product.isActive ? "Yes" : "No",
    Featured: product.isFeatured ? "Yes" : "No",
    "Created At": formatDate(product.createdAt),
    "Updated At": formatDate(product.lastUpdated),
  };

  if (options.includeImages) {
    const images = product.images as string[];
    exportedProduct.Images = images?.join("; ") || "";
  }

  return exportedProduct;
}
