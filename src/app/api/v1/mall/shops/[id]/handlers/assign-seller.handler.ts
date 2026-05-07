import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-helper";
import prisma from "@/lib/db/prisma";
import { successResponse } from "@/lib/api/response";
import { ValidationError, ConflictError } from "@/lib/errors/custom-errors";
import { logger } from "@/lib/utils/logger";
import { validateShopId } from "../validators";
import { transformShopForDetail } from "../transforms";
import { NotFoundError } from "@/lib/errors/custom-errors";
import { SHOP_DETAIL_SELECT } from "../selects";

export async function assignSellerHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = requireAuth(request, ["MALL_OWNER"]);
  const { id } = await params;

  validateShopId(id);

  const body = await request.json();
  const { sellerId, action } = body;

  if (action === "assign") {
    if (!sellerId) {
      throw new ValidationError("Seller ID is required");
    }

    const updatedShop = await prisma.$transaction(async (tx) => {
      const shop = await tx.shop.findUnique({
        where: { id },
        select: { id: true, sellerId: true, fullCode: true },
      });

      if (!shop) {
        throw new NotFoundError("Shop not found");
      }

      if (shop.sellerId) {
        throw new ConflictError("Shop already has an assigned seller");
      }

      const seller = await tx.seller.findUnique({
        where: { id: sellerId },
        select: { id: true, businessName: true },
      });

      if (!seller) {
        throw new NotFoundError("Seller not found");
      }

      const existingShop = await tx.shop.findFirst({
        where: { sellerId },
        select: { id: true, fullCode: true },
      });

      if (existingShop) {
        await tx.product.updateMany({
          where: { shopId: existingShop.id },
          data: { shopId: id },
        });

        await tx.shop.update({
          where: { id: existingShop.id },
          data: { sellerId: null },
        });

        logger.info("Products moved from old shop to new shop", {
          oldShopId: existingShop.id,
          newShopId: id,
          sellerId,
        });
      }

      return tx.shop.update({
        where: { id },
        data: { sellerId },
        select: SHOP_DETAIL_SELECT,
      });
    });

    logger.info("Seller assigned to shop", {
      shopId: id,
      sellerId,
      userId: user.userId,
    });

    return successResponse({
      message: "Seller assigned successfully",
      shop: transformShopForDetail(updatedShop),
    });
  } else if (action === "unassign") {
    // Verify shop exists and has a seller
    const shop = await prisma.shop.findUnique({
      where: { id },
      select: { id: true, sellerId: true },
    });

    if (!shop) {
      throw new NotFoundError("Shop not found");
    }

    if (!shop.sellerId) {
      throw new ValidationError("Shop has no assigned seller");
    }

    const updatedShop = await prisma.shop.update({
      where: { id },
      data: { sellerId: null },
      select: SHOP_DETAIL_SELECT,
    });

    logger.info("Seller unassigned from shop", {
      shopId: id,
      previousSellerId: shop.sellerId,
      userId: user.userId,
    });

    return successResponse({
      message: "Seller unassigned successfully",
      shop: transformShopForDetail(updatedShop),
    });
  } else {
    throw new ValidationError('Invalid action. Use "assign" or "unassign".');
  }
}
