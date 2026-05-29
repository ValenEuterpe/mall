import { withMiddleware } from "@/lib/api/middleware";
import { listSellersHandler } from "./handlers/list-sellers.handler";

export const GET = withMiddleware(listSellersHandler, {
    requireAuth: true,
    allowedRoles: ["MALL_OWNER"],
    rateLimit: true,
    skipRateLimitForRoles: ["SELLER", "MALL_OWNER"],
});