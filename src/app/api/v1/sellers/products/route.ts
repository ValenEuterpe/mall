import { withMiddleware } from "@/lib/api/middleware";
import { listProductsHandler } from "./handlers/list-products.handler";
import { createProductHandler } from "./handlers/create-product.handler";

export const GET = withMiddleware(listProductsHandler, {
  requireAuth: true,
  allowedRoles: ["SELLER"],
  rateLimit: true,
  skipRateLimitForRoles: ["SELLER", "MALL_OWNER"],
});

export const POST = withMiddleware(createProductHandler, {
  requireAuth: true,
  allowedRoles: ["SELLER"],
  rateLimit: true,
  rateLimitMax: 20,
  skipRateLimitForRoles: ["MALL_OWNER"],
  auditAction: "PRODUCT_CREATED",
});
