import { ForbiddenError } from "@/lib/errors/custom-errors";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { productCreateSchema } from "@/lib/validation/schemas/product";

type CreateInput = z.infer<typeof productCreateSchema>;

export async function checkForDuplicateSkuOrBarcode(
  shopId: string,
  data: Pick<CreateInput, "sku" | "barcode">
): Promise<void> {
  if (!data.sku && !data.barcode) return;

  const existingProduct = await prisma.product.findFirst({
    where: {
      shopId,
      OR: [
        data.sku ? { sku: data.sku } : {},
        data.barcode ? { barcode: data.barcode } : {},
      ].filter((condition) => Object.keys(condition).length > 0),
    },
    select: { id: true, sku: true, barcode: true },
  });

  if (existingProduct) {
    const duplicateField = existingProduct.sku === data.sku ? "SKU" : "barcode";
    throw new ForbiddenError(
      `A product with this ${duplicateField} already exists in your shop`
    );
  }
}
