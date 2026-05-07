import { Prisma } from "@/prisma/generated/client";

import type { SellerFilters } from "../types";

/**
 * Builds Prisma where clause for seller list filtering.
 *
 * NOTE: Seller model does NOT have `registeredAt`. Registration is inferred by whether
 * the seller has set their password (`password` is NULL until setup is completed).
 */
export function buildWhereClause(
  filters: SellerFilters,
  searchCondition: Prisma.SellerWhereInput
): Prisma.SellerWhereInput {
  const where: Prisma.SellerWhereInput = {
    ...searchCondition,
  };

  // Verification filter
  if (filters.isVerified === "true") {
    where.isVerified = true;
  } else if (filters.isVerified === "false") {
    where.isVerified = false;
  }

  // Active filter
  if (filters.isActive === "true") {
    where.isActive = true;
  } else if (filters.isActive === "false") {
    where.isActive = false;
  }

  // Has shop filter
  if (filters.hasShop === "true") {
    where.shops = { some: {} };
  } else if (filters.hasShop === "false") {
    where.shops = { none: {} };
  }

  // Registration status filter
  if (filters.registrationStatus === "pending") {
    where.password = null;
  } else if (filters.registrationStatus === "completed") {
    where.password = { not: null };
  }

  return where;
}
