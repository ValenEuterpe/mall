import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-helper";
import prisma from "@/lib/db/prisma";
import { noContentResponse } from "@/lib/api/response";
import { ConflictError } from "@/lib/errors/custom-errors";
import { logger } from "@/lib/utils/logger";
import { validateShopId } from "../validators";
import { NotFoundError } from "@/lib/errors/custom-errors";

export async function deleteShopHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    const user = requireAuth(request, ["MALL_OWNER"]);
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    validateShopId(id);

    // Check force parameter
    const force = searchParams.get("force") === "true";

    // Verify shop exists and check dependencies
    const shop = await prisma.shop.findUnique({
        where: { id },
        select: {
            id: true,
            fullCode: true,
            isActive: true,
            sellerId: true,
            seller: {
                select: {
                    id: true,
                    businessName: true,
                },
            },
            _count: {
                select: {
                    products: {
                        where: { isActive: true },
                    },
                },
            },
        },
    });

    if (!shop) {
        throw new NotFoundError("Shop not found");
    }

    // Check if already inactive
    if (!shop.isActive) {
        return noContentResponse();
    }

    // Check for active seller
    if (shop.seller && !force) {
        throw new ConflictError(
            `Cannot delete shop with active seller "${shop.seller.businessName}". ` +
            "Remove the seller first or use force=true to proceed."
        );
    }

    // Check for active products
    if (shop._count.products > 0 && !force) {
        throw new ConflictError(
            `Cannot delete shop with ${shop._count.products} active products. ` +
            "Deactivate products first or use force=true to proceed."
        );
    }

    // Perform soft delete with cascade handling
    await prisma.$transaction(async (tx) => {
        // Deactivate all products if force delete
        if (force && shop._count.products > 0) {
            await tx.product.updateMany({
                where: { shopId: id },
                data: { isActive: false },
            });
        }

        // Soft delete the shop
        await tx.shop.update({
            where: { id },
            data: {
                isActive: false,
                updatedAt: new Date(),
            },
        });
    });

    logger.info("Shop deleted", {
        shopId: id,
        shopCode: shop.fullCode,
        userId: user.userId,
        force,
        hadSeller: !!shop.seller,
        productsDeactivated: force ? shop._count.products : 0,
    });

    return noContentResponse();
}