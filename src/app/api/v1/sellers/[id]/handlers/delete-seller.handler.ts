import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-helper";
import prisma from "@/lib/db/prisma";
import { noContentResponse } from "@/lib/api/response";
import { ValidationError, AuthenticationError } from "@/lib/errors/custom-errors";
import { verifyPassword } from "@/lib/auth/password";
import { logger } from "@/lib/utils/logger";
import { validateSellerId } from "../../utils/validate-seller-id";
import { NotFoundError } from "@/lib/errors/custom-errors";

export async function deleteSellerHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = requireAuth(request, ["MALL_OWNER"]);
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  validateSellerId(id);

  // Password re-confirmation: destructive action, never trust client-only checks.
  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : null;
  if (!password) {
    throw new ValidationError("Password is required to remove a seller");
  }

  const owner = await prisma.mallOwner.findUnique({
    where: { id: user.userId },
    select: { password: true },
  });
  if (!owner || !(await verifyPassword(password, owner.password))) {
    throw new AuthenticationError("Incorrect password");
  }

  // Check for confirm parameter
  const confirm = searchParams.get("confirm");

  // Verify seller exists and check dependencies
  const seller = await prisma.seller.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      businessName: true,
      shops: {
        select: {
          id: true,
          fullCode: true,
          _count: {
            select: {
              products: true,
            },
          },
        },
      },
    },
  });

  if (!seller) {
    throw new NotFoundError("Seller not found");
  }

  // Calculate total products
  const totalProducts = seller.shops.reduce(
    (sum, shop) => sum + shop._count.products,
    0
  );

  // Require confirmation for sellers with data
  if (totalProducts > 0 && confirm !== seller.email) {
    throw new ValidationError(
      `This seller has ${totalProducts} products. To confirm deletion, add ?confirm=${seller.email} to the request.`
    );
  }

  // Perform deletion
  await prisma.$transaction(async (tx) => {
    // Delete products first (while shop.sellerId still points to this seller)
    if (totalProducts > 0) {
      await tx.product.deleteMany({
        where: {
          shop: {
            sellerId: id,
          },
        },
      });
    }

    // Clear shop assignments
    await tx.shop.updateMany({
      where: { sellerId: id },
      data: { sellerId: null },
    });

    // Delete seller
    await tx.seller.delete({
      where: { id },
    });
  });

  logger.info("Seller deleted", {
    sellerId: id,
    email: seller.email,
    businessName: seller.businessName,
    shopsCleared: seller.shops.length,
    productsDeleted: totalProducts,
    userId: user.userId,
  });

  return noContentResponse();
}
