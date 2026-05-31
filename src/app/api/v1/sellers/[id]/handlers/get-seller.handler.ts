import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-helper";
import { successResponse } from "@/lib/api/response";
import { logger } from "@/lib/utils/logger";
import { validateSellerId } from "../../utils/validate-seller-id";
import { transformSellerForDetail } from "../../transforms/transform-seller-for-detail";
import { getSellerById } from "../../queries/get-seller-by-id";

export async function getSellerHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = requireAuth(request, ["MALL_OWNER"]);
  const { id } = await params;

  validateSellerId(id);

  const seller = await getSellerById(id);

  logger.debug("Seller details fetched", {
    sellerId: id,
    userId: user.userId,
  });

  return successResponse(transformSellerForDetail(seller));
}
