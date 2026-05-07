import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/db/prisma";
import { TokenType } from "@/prisma/generated/client";

import { withMiddleware } from "@/lib/api/middleware";
import { requireAuth } from "@/lib/api/auth-helper";

import { validateBody } from "@/lib/validation/request";
import { sellerInviteSchema } from "@/lib/validation/schemas/auth";

import { generateVerificationToken } from "@/lib/auth/tokens";
import { sendInvitationEmail, dispatch } from "@/lib/email/send";

import { createdResponse, methodNotAllowed } from "@/lib/api/response";
import {
  ConflictError,
  NotFoundError,
  AuthorizationError,
} from "@/lib/errors/custom-errors";
import { hasPermission } from "@/services";
import { env } from "@/env";

interface InviteSellerResponse {
  message: string;
  seller: {
    id: string;
    email: string;
    shopId: string;
    invitedAt?: Date;
  };
}

async function handleInviteSeller(request: NextRequest): Promise<NextResponse> {
  const user = requireAuth(request, ["MALL_OWNER"]);

  if (!hasPermission(user.role, "sellers", "invite")) {
    throw new AuthorizationError("You don't have permission to invite sellers");
  }

  const data = await validateBody(request, sellerInviteSchema);
  const email = data.email.toLowerCase();

  const inviteToken = generateVerificationToken();
  const inviteExpiry = new Date();
  inviteExpiry.setDate(inviteExpiry.getDate() + 7);

  const result = await prisma.$transaction(async (tx) => {
    // 1) Verify shop exists and is unassigned
    const shop = await tx.shop.findUnique({
      where: { id: data.shopId },
      select: { id: true, sellerId: true },
    });

    if (!shop) {
      throw new NotFoundError("Shop not found");
    }

    // Allow re-invite if the shop is assigned to the same seller being re-invited
    if (shop.sellerId) {
      const existingSeller = await tx.seller.findUnique({
        where: { email },
        select: { id: true },
      });
      if (!existingSeller || shop.sellerId !== existingSeller.id) {
        throw new ConflictError("Shop already has a seller assigned");
      }
    }

    // 2) Upsert seller (existing = resend invite; new = create)
    const existingSeller = await tx.seller.findUnique({
      where: { email },
      select: { id: true, email: true, password: true },
    });

    let sellerId: string;
    let invitedAt: Date;

    if (existingSeller) {
      if (existingSeller.password) {
        throw new ConflictError(
          "Seller with this email already exists and has completed setup."
        );
      }

      const updatedSeller = await tx.seller.update({
        where: { id: existingSeller.id },
        data: {
          inviteToken,
          inviteExpiry,
          invitedAt: new Date(),
          businessName: data.businessName,
        },
        select: { id: true, email: true, invitedAt: true },
      });

      sellerId = updatedSeller.id;
      invitedAt = updatedSeller.invitedAt;
    } else {
      const createdSeller = await tx.seller.create({
        data: {
          email,
          businessName: data.businessName,
          inviteToken,
          inviteExpiry,
          invitedAt: new Date(),
          isActive: true,
        },
        select: { id: true, email: true, invitedAt: true },
      });

      sellerId = createdSeller.id;
      invitedAt = createdSeller.invitedAt;
    }

    // 3) Assign seller to shop
    await tx.shop.update({
      where: { id: data.shopId },
      data: { sellerId },
      select: { id: true },
    });

    // 4) Replace invitation verification token
    await tx.verificationToken.deleteMany({
      where: { identifier: email, type: TokenType.INVITATION },
    });

    await tx.verificationToken.create({
      data: {
        identifier: email,
        token: inviteToken,
        type: TokenType.INVITATION,
        expires: inviteExpiry,
      },
    });

    return { sellerId, invitedAt };
  });

  const setupUrl = `${env.NEXT_PUBLIC_APP_URL}/en/setup-account?token=${inviteToken}`;
  dispatch(() => sendInvitationEmail(data.email, setupUrl, user.email));

  return createdResponse<InviteSellerResponse>({
    message: "Seller invited successfully",
    seller: {
      id: result.sellerId,
      email,
      shopId: data.shopId,
      invitedAt: result.invitedAt,
    },
  });
}

export const POST = withMiddleware(handleInviteSeller, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  skipRateLimitForRoles: ["MALL_OWNER"],
  auditAction: "SELLER_INVITED",
});

export const GET = () => methodNotAllowed(["POST"]);
export const PUT = () => methodNotAllowed(["POST"]);
export const PATCH = () => methodNotAllowed(["POST"]);
export const DELETE = () => methodNotAllowed(["POST"]);
