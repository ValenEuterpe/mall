import prisma from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/errors/custom-errors";
import { SELLER_DETAIL_SELECT } from "../selects";

export async function getSellerById(id: string) {
    const seller = await prisma.seller.findUnique({
        where: { id },
        select: SELLER_DETAIL_SELECT,
    });

    if (!seller) {
        throw new NotFoundError("Seller not found");
    }

    return seller;
}