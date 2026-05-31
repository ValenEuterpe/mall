import { SellerFilters } from "./types";

export function parseSellerFilters(
  searchParams: URLSearchParams
): SellerFilters {
  return {
    isVerified: (searchParams.get("verified") as "true" | "false") || undefined,
    isActive: (searchParams.get("active") as "true" | "false") || undefined,
    hasShop: (searchParams.get("hasShop") as "true" | "false") || undefined,
    registrationStatus:
      (searchParams.get("status") as "pending" | "completed") || undefined,
  };
}
