import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-helper";
import { successResponse } from "@/lib/api/response";
import { logger } from "@/lib/utils/logger";

import { validateShopId } from "../validators";
import { transformShopForDetail } from "../transforms";
import { getShopById } from "../../queries/get-shop-by-id";

export async function getShopHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    const user = requireAuth(request, ["MALL_OWNER"]);
    const { id } = await params;

    validateShopId(id);

    const shop = await getShopById(id);
    const transformedShop = transformShopForDetail(shop);

    logger.debug("Shop details fetched", {
        shopId: id,
        userId: user.userId,
    });

    return successResponse(transformedShop);
}