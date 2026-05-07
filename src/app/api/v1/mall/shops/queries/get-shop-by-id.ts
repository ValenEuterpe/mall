import prisma from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/errors/custom-errors";
import { SHOP_DETAIL_SELECT } from "../[id]/selects";

export async function getShopById(id: string) {
  const shop = await prisma.shop.findUnique({
    where: { id },
    select: SHOP_DETAIL_SELECT,
  });

  if (!shop) {
    throw new NotFoundError("Shop not found");
  }

  return shop;
}
