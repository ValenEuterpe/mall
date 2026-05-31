import { NotFoundError } from "@/lib/errors/custom-errors";
import prisma from "@/lib/db/prisma";

export async function getSellerShop(
  sellerId: string
): Promise<{ id: string; shopName: string | null; fullCode: string }> {
  const shop = await prisma.shop.findFirst({
    where: { sellerId },
    select: { id: true, shopName: true, fullCode: true },
  });

  if (!shop) {
    throw new NotFoundError(
      "Shop not found. Please contact the mall owner to assign a shop to your account."
    );
  }

  // NOTE: shopName is optional in the current schema/UI. Product creation should not be blocked
  // by a missing shop name; it can be completed later by the mall owner/seller profile.
  return {
    id: shop.id,
    shopName: shop.shopName ?? null,
    fullCode: shop.fullCode,
  };
}
