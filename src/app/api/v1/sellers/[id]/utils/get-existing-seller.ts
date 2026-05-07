import prisma from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/errors/custom-errors";

export async function getExistingSeller(id: string) {
    const existingSeller = await prisma.seller.findUnique({
        where: { id },
        select: { id: true, email: true },
    });

    if (!existingSeller) {
        throw new NotFoundError("Seller not found");
    }

    return existingSeller;
}