import { logger } from "@/lib/utils/logger";
import prisma from "@/lib/db/prisma";

export function isValidId(id: string): boolean {
    if (!id || typeof id !== "string") {
        return false;
    }
    return /^[a-zA-Z0-9_-]{20,36}$/.test(id);
}

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

export function isValidProductId(id: string): boolean {
    if (!id || typeof id !== "string") {
        return false;
    }
    return /^[a-zA-Z0-9_-]{20,36}$/.test(id);
}

export async function incrementViewCount(productId: string): Promise<void> {
    await prisma.product.update({
        where: { id: productId },
        data: {
            viewCount: { increment: 1 },
        },
    });
}