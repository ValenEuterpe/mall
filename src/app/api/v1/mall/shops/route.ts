import { withMiddleware } from "@/lib/api/middleware";
import { listShopsHandler } from "./handlers/list-shops.handler";

export const GET = withMiddleware(listShopsHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  skipRateLimitForRoles: ["MALL_OWNER"],
});
