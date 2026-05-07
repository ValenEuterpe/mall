import prisma from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/errors/custom-errors";

export async function getExistingShop(id: string) {
    const existingShop = await prisma.shop.findUnique({
        where: { id },
        select: { id: true, fullCode: true, sellerId: true },
    });

    if (!existingShop) {
        throw new NotFoundError("Shop not found");
    }

    return existingShop;
}