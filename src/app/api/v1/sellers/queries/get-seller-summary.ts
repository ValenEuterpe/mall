import prisma from "@/lib/db/prisma";

import type { SellerSummary } from "../types";

export async function getSellerSummary(): Promise<SellerSummary> {
  const [total, verified, active, withShops, pendingRegistration] =
    await Promise.all([
      prisma.seller.count(),
      prisma.seller.count({ where: { isVerified: true } }),
      prisma.seller.count({ where: { isActive: true } }),
      prisma.seller.count({ where: { shops: { some: {} } } }),
      // pending registration = password not set yet
      prisma.seller.count({ where: { password: null } }),
    ]);

  return {
    total,
    verified,
    unverified: total - verified,
    active,
    inactive: total - active,
    withShops,
    pendingRegistration,
  };
}
