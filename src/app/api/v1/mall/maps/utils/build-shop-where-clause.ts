import { Prisma } from "@/prisma/generated/client";

/**
 * Build a where clause for filtering shops based on location.
 * All location parameters are optional - if not provided, that filter is not applied.
 */
export function buildShopWhereClause(
  venue?: string,
  floor?: string,
  building?: string,
  includeVacant: boolean = true
): Prisma.ShopWhereInput {
  const where: Prisma.ShopWhereInput = {
    isActive: true,
  };

  // Filter by venue if provided
  if (venue) {
    where.venue = venue;
  }

  // Filter by floor if provided
  if (floor) {
    where.floor = floor;
  }

  // Filter by building if provided
  if (building) {
    where.building = building;
  }

  // Filter out vacant shops if requested
  if (!includeVacant) {
    where.sellerId = { not: null };
  }

  return where;
}
