import prisma from "@/lib/db/prisma";
import { Prisma } from "@/prisma/generated/client";
import { buildSearchIndex } from "@/lib/search/tokens";
import { ImportError, ProcessedProduct } from "../types";

export async function processBatch(
  products: ProcessedProduct[],
  shopId: string,
  updateExisting: boolean,
  batchStartIndex: number,
  seenIdentifiers?: Set<string>
): Promise<{
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: ImportError[];
}> {
  const result = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [] as ImportError[],
  };

  // Track barcodes/SKUs seen in this import to detect in-batch duplicates
  const seen = seenIdentifiers ?? new Set<string>();

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const rowNumber = batchStartIndex + i + 2; // +2 for header + 1-indexing

    try {
      // Check for in-batch duplicates first
      const identifiers: string[] = [];
      if (product.barcode) identifiers.push(`barcode:${product.barcode}`);
      if (product.sku) identifiers.push(`sku:${product.sku}`);

      const isDuplicateInBatch = identifiers.some((id) => seen.has(id));
      if (isDuplicateInBatch) {
        result.skipped++;
        result.errors.push({
          row: rowNumber,
          field: product.name,
          message: "Duplicate barcode/SKU within same import file",
        });
        continue;
      }

      // Check for existing product in this shop by barcode or SKU
      let existingProduct = null;
      if (product.barcode || product.sku) {
        const orConditions = [
          product.barcode ? { barcode: product.barcode } : null,
          product.sku ? { sku: product.sku } : null,
        ].filter(Boolean) as Prisma.ProductWhereInput[];

        existingProduct = await prisma.product.findFirst({
          where: { shopId, OR: orConditions },
          select: { id: true, shopId: true },
        });
      }

      const searchIndex = buildSearchIndex({
        name_en: product.name,
        brand: product.brand,
        sku: product.sku,
      });

      if (existingProduct) {
        if (updateExisting) {
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              name: product.name,
              name_en: product.name,
              description: product.description,
              basePrice: product.basePrice,
              stockQuantity: product.stockQuantity,
              brand: product.brand,
              status: product.status,
              lastUpdated: new Date(),
              ...searchIndex,
            },
          });
          result.updated++;
        } else {
          result.skipped++;
          result.errors.push({
            row: rowNumber,
            field: product.name,
            message:
              "Product with same barcode/SKU already exists (enable 'Update existing' to overwrite)",
          });
        }
      } else {
        // Create new
        const productData: Prisma.ProductCreateInput = {
          shop: { connect: { id: shopId } },
          name: product.name,
          name_en: product.name,
          description: product.description,
          basePrice: product.basePrice,
          stockQuantity: product.stockQuantity,
          brand: product.brand,
          barcode: product.barcode,
          sku: product.sku,
          status: product.status,
          ...searchIndex,
          ...(product.categoryKey && {
            category: { connect: { id: product.categoryKey } },
          }),
        };

        await prisma.product.create({ data: productData });
        result.created++;
      }

      // Track successfully processed identifiers
      identifiers.forEach((id) => seen.add(id));
    } catch (error) {
      result.failed++;
      result.errors.push({
        row: rowNumber,
        field: product.name,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return result;
}
