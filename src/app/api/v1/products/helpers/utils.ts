import { logger } from "@/lib/utils/logger";
import prisma from "@/lib/db/prisma";

export { isValidId, isValidProductId } from "./ids";

export async function logProductSearch(
  query: string,
  filters: unknown,
  resultCount: number,
  userId?: string
): Promise<void> {
  if (query.length >= 2) {
    logger.info("Product search", {
      query,
      filters,
      resultCount,
      userId,
    });
  }
}

export async function incrementViewCount(productId: string): Promise<void> {
  await prisma.product.update({
    where: { id: productId },
    data: {
      viewCount: { increment: 1 },
    },
  });
}
