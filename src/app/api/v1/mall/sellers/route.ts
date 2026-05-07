import { withMiddleware } from "@/lib/api/middleware";

// Reuse the existing sellers implementation.
// Mall-owner sellers list is already implemented under `/api/v1/sellers`.
import { listSellersHandler } from "@/app/api/v1/sellers/handlers/list-sellers.handler";

export const GET = withMiddleware(listSellersHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  skipRateLimitForRoles: ["MALL_OWNER"],
});
