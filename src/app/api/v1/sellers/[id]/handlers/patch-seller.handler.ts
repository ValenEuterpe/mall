import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-helper";
import prisma from "@/lib/db/prisma";
import { validateBody } from "@/lib/validation/request";
import { successResponse } from "@/lib/api/response";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors/custom-errors";
import { logger } from "@/lib/utils/logger";

import { verificationSchema, shopAssignmentSchema } from "../schemas";
import { validateSellerId } from "../../utils/validate-seller-id";
import { transformSellerForDetail } from "../../transforms/transform-seller-for-detail";
import { SELLER_DETAIL_SELECT } from "../../selects";

export async function patchSellerHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = requireAuth(request, ["MALL_OWNER"]);
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  validateSellerId(id);

  const action = searchParams.get("action");

  const seller = await prisma.seller.findUnique({
    where: { id },
    select: { id: true, email: true, businessName: true, isVerified: true },
  });

  if (!seller) {
    throw new NotFoundError("Seller not found");
  }

  switch (action) {
    case "verify": {
      const data = await validateBody(request, verificationSchema);

      const updatedSeller = await prisma.seller.update({
        where: { id },
        data: {
          isVerified: data.isVerified,
          updatedAt: new Date(),
        },
        select: SELLER_DETAIL_SELECT,
      });

      const actionMsg = data.isVerified ? "verified" : "unverified";

      logger.info(`Seller ${actionMsg}`, {
        sellerId: id,
        userId: user.userId,
        businessName: seller.businessName,
        notes: data.notes,
      });

      return successResponse({
        message: `Seller ${actionMsg} successfully`,
        seller: transformSellerForDetail(updatedSeller),
      });
    }

    case "shops": {
      const data = await validateBody(request, shopAssignmentSchema);
      const { action: shopAction, shopId, shopIds } = data;

      switch (shopAction) {
        case "assign": {
          if (!shopId) {
            throw new ValidationError("Shop ID is required for assignment");
          }

          const shop = await prisma.shop.findUnique({
            where: { id: shopId },
            select: {
              id: true,
              fullCode: true,
              sellerId: true,
              isActive: true,
            },
          });

          if (!shop) {
            throw new NotFoundError("Shop not found");
          }

          if (!shop.isActive) {
            throw new ValidationError("Cannot assign inactive shop");
          }

          if (shop.sellerId) {
            throw new ConflictError(
              `Shop ${shop.fullCode} is already assigned to another seller`
            );
          }

          await prisma.shop.update({
            where: { id: shopId },
            data: { sellerId: id },
          });

          logger.info("Shop assigned to seller", {
            sellerId: id,
            shopId,
            shopCode: shop.fullCode,
            userId: user.userId,
          });
          break;
        }

        case "unassign": {
          const targetShopIds = shopIds || (shopId ? [shopId] : []);

          if (targetShopIds.length === 0) {
            await prisma.shop.updateMany({
              where: { sellerId: id },
              data: { sellerId: null },
            });

            logger.info("All shops unassigned from seller", {
              sellerId: id,
              userId: user.userId,
            });
          } else {
            await prisma.shop.updateMany({
              where: {
                id: { in: targetShopIds },
                sellerId: id,
              },
              data: { sellerId: null },
            });

            logger.info("Shops unassigned from seller", {
              sellerId: id,
              shopIds: targetShopIds,
              userId: user.userId,
            });
          }
          break;
        }

        case "reassign": {
          if (!shopId) {
            throw new ValidationError("New shop ID is required for reassignment");
          }

          const newShop = await prisma.shop.findUnique({
            where: { id: shopId },
            select: {
              id: true,
              fullCode: true,
              sellerId: true,
              isActive: true,
            },
          });

          if (!newShop) {
            throw new NotFoundError("New shop not found");
          }

          if (!newShop.isActive) {
            throw new ValidationError("Cannot assign inactive shop");
          }

          if (newShop.sellerId && newShop.sellerId !== id) {
            throw new ConflictError(
              `Shop ${newShop.fullCode} is already assigned to another seller`
            );
          }

          await prisma.$transaction([
            prisma.shop.updateMany({
              where: { sellerId: id },
              data: { sellerId: null },
            }),
            prisma.shop.update({
              where: { id: shopId },
              data: { sellerId: id },
            }),
          ]);

          logger.info("Seller reassigned to new shop", {
            sellerId: id,
            newShopId: shopId,
            newShopCode: newShop.fullCode,
            userId: user.userId,
          });
          break;
        }
      }

      const updatedSeller = await prisma.seller.findUnique({
        where: { id },
        select: SELLER_DETAIL_SELECT,
      });

      return successResponse({
        message: `Shop ${shopAction} completed successfully`,
        seller: transformSellerForDetail(updatedSeller!),
      });
    }

    default:
      throw new ValidationError(
        'Invalid action. Use "verify" or "shops" as action query parameter.'
      );
  }
}
