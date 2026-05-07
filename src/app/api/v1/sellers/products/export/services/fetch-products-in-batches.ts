import prisma from "@/lib/db/prisma";
import { Prisma } from "@/prisma/generated/client";

export async function fetchProductsInBatches<
    S extends Prisma.ProductSelect
>(
    where: Prisma.ProductWhereInput,
    select: S,
    batchSize: number = 500
): Promise<Prisma.ProductGetPayload<{ select: S }>[]> {
    const products: Prisma.ProductGetPayload<{ select: S }>[] = [];
    // we'll store the last item's unique cursor as a ProductWhereUniqueInput
    let cursor: Prisma.ProductWhereUniqueInput | undefined;

    while (true) {
        const batch = await prisma.product.findMany({
            where,
            select,
            take: batchSize,
            orderBy: { createdAt: "desc" },
            ...(cursor ? { skip: 1, cursor } : {}),
        });

        if (batch.length === 0) break;

        products.push(...batch);

        // make sure the selected payload includes `id`, otherwise this will be undefined
        const last = batch[batch.length - 1] as unknown as { id: string } | undefined;
        if (!last?.id) {
            // if `id` isn't present in `select`, we can't cursor-paginate — break to avoid infinite loop
            break;
        }
        cursor = { id: last.id };
        if (batch.length < batchSize) break;
    }

    return products;
}
