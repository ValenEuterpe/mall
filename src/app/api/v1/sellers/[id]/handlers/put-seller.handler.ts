import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-helper";
import prisma from "@/lib/db/prisma";
import { validateBody } from "@/lib/validation/request";
import { successResponse } from "@/lib/api/response";
import { logger } from "@/lib/utils/logger";

import { sellerUpdateSchema } from "../schemas";
import { validateSellerId } from "../../utils/validate-seller-id";
import { transformSellerForDetail } from "../../transforms/transform-seller-for-detail";
import { getExistingSeller } from "../utils/get-existing-seller";
import { SELLER_DETAIL_SELECT } from "../../selects";

export async function putSellerHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = requireAuth(request, ["MALL_OWNER"]);
  const { id } = await params;

  validateSellerId(id);

  await getExistingSeller(id);

  const data = await validateBody(request, sellerUpdateSchema);

  const updatedSeller = await prisma.seller.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
    select: SELLER_DETAIL_SELECT,
  });

  logger.info("Seller updated", {
    sellerId: id,
    userId: user.userId,
    changes: Object.keys(data),
  });

  return successResponse(transformSellerForDetail(updatedSeller));
}
