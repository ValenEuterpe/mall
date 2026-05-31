import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-helper";
import prisma from "@/lib/db/prisma";
import { shopUpdateSchema } from "@/lib/validation/schemas/shop";
import { validateBody } from "@/lib/validation/request";
import { successResponse } from "@/lib/api/response";
import { logger } from "@/lib/utils/logger";
import { validateShopId } from "../validators";
import { transformShopForDetail } from "../transforms";
import { getExistingShop } from "../utils/get-existing-shop";
import { SHOP_DETAIL_SELECT } from "../selects";

export async function patchShopHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = requireAuth(request, ["MALL_OWNER"]);
  const { id } = await params;

  validateShopId(id);

  // Verify shop exists
  await getExistingShop(id); // Minimal check

  // Parse partial update
  const data = await validateBody(request, shopUpdateSchema.partial());
  // `contacts` is intentionally stripped from the rest spread (handled separately).
  const { contacts: _contacts, ...shopFields } = data;

  // Perform update
  const updatedShop = await prisma.shop.update({
    where: { id },
    data: {
      ...shopFields,
      updatedAt: new Date(),
    },
    select: SHOP_DETAIL_SELECT,
  });

  logger.info("Shop partially updated", {
    shopId: id,
    userId: user.userId,
    fields: Object.keys(data),
  });

  return successResponse(transformShopForDetail(updatedShop));
}
