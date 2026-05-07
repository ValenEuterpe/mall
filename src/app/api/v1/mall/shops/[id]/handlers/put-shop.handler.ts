import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-helper";
import prisma from "@/lib/db/prisma";
import { shopUpdateSchema } from "@/lib/validation/schemas/shop";
import { validateBody } from "@/lib/validation/request";
import { successResponse } from "@/lib/api/response";
import { ConflictError } from "@/lib/errors/custom-errors";
import { logger } from "@/lib/utils/logger";
import { Prisma } from "@/prisma/generated/client";
import { validateShopId } from "../validators";
import { transformShopForDetail } from "../transforms";
import { getExistingShop } from "../utils/get-existing-shop";
import { SHOP_DETAIL_SELECT } from "../selects";

export async function putShopHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    const user = requireAuth(request, ["MALL_OWNER"]);
    const { id } = await params;

    validateShopId(id);

    // Verify shop exists first
    const existingShop = await getExistingShop(id);

    // Validate and parse request body
    const data = await validateBody(request, shopUpdateSchema);
    const { contacts, ...shopFields } = data;

    // If fullCode is being changed, check for conflicts
    if (shopFields.fullCode && shopFields.fullCode !== existingShop.fullCode) {
        const codeConflict = await prisma.shop.findUnique({
            where: { fullCode: data.fullCode },
            select: { id: true },
        });

        if (codeConflict) {
            throw new ConflictError(
                `Shop code "${data.fullCode}" is already in use`
            );
        }
    }

    // Perform update
    try {
        const updatedShop = await prisma.shop.update({
            where: { id },
            data: {
                ...shopFields,
                updatedAt: new Date(),
            },
            select: SHOP_DETAIL_SELECT,
        });

        logger.info("Shop updated", {
            shopId: id,
            userId: user.userId,
            changes: Object.keys(data),
        });

        return successResponse(transformShopForDetail(updatedShop));
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            throw new ConflictError("Shop code already exists");
        }
        throw error;
    }
}