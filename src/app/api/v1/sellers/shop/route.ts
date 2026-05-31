/**
 * Seller Shop API
 *
 * GET /api/v1/sellers/shop - Get the seller's first assigned shop with contacts
 * PATCH /api/v1/sellers/shop - Update shop details (image, description, contacts)
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/db/prisma";
import { successResponse, methodNotAllowed } from "@/lib/api/response";
import { logger } from "@/lib/utils/logger";
import { shopUpdateSchema } from "@/lib/validation/schemas/shop";
import type { ContactType } from "@/prisma/generated/client";

async function getSellerShop(sellerId: string) {
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: {
      shops: {
        take: 1,
        select: {
          id: true,
          fullCode: true,
          shopName: true,
          description: true,
          imageUrl: true,
          venue: true,
          building: true,
          floor: true,
          shopNumber: true,
          openingHours: true,
          contacts: {
            select: { id: true, type: true, value: true, label: true },
          },
        },
      },
    },
  });

  return seller?.shops[0] ?? null;
}

export const GET = withAuth(
  async (_request: NextRequest, { user }) => {
    const shop = await getSellerShop(user.userId);

    if (!shop) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "No shop assigned" },
        },
        { status: 404 }
      );
    }

    return successResponse(shop);
  },
  { roles: ["SELLER"] }
);

export const PATCH = withAuth(
  async (request: NextRequest, { user }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_JSON",
            message: "Invalid JSON in request body",
          },
        },
        { status: 400 }
      );
    }

    const parsed = shopUpdateSchema
      .pick({
        shopName: true,
        description: true,
        imageUrl: true,
        contacts: true,
      })
      .safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const shop = await getSellerShop(user.userId);
    if (!shop) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "No shop assigned" },
        },
        { status: 404 }
      );
    }

    const { contacts, ...shopFields } = parsed.data;

    await prisma.$transaction(async (tx) => {
      // Update shop scalar fields
      if (Object.keys(shopFields).length > 0) {
        await tx.shop.update({
          where: { id: shop.id },
          data: shopFields,
        });
      }

      // Replace contacts if provided
      if (contacts !== undefined) {
        await tx.shopContact.deleteMany({ where: { shopId: shop.id } });
        if (contacts.length > 0) {
          await tx.shopContact.createMany({
            data: contacts.map((c) => ({
              shopId: shop.id,
              type: c.type as ContactType,
              value: c.value,
              label: c.label ?? null,
            })),
          });
        }
      }
    });

    logger.info("Seller updated shop", {
      shopId: shop.id,
      sellerId: user.userId,
      fields: Object.keys(parsed.data),
    });

    // Re-fetch updated shop
    const updated = await getSellerShop(user.userId);
    return successResponse(updated);
  },
  { roles: ["SELLER"] }
);

export const POST = () => methodNotAllowed(["GET", "PATCH"]);
export const PUT = () => methodNotAllowed(["GET", "PATCH"]);
export const DELETE = () => methodNotAllowed(["GET", "PATCH"]);
