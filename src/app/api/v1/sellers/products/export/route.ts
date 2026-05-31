import { withMiddleware } from "@/lib/api/middleware";
import { exportProductsHandler } from "./handlers/export-products.handler";

export const GET = withMiddleware(exportProductsHandler, {
  requireAuth: true,
  allowedRoles: ["SELLER"],
  rateLimit: true,
  skipRateLimitForRoles: ["SELLER", "MALL_OWNER"],
  rateLimitMax: 10,
  auditAction: "PRODUCTS_EXPORTED",
});
