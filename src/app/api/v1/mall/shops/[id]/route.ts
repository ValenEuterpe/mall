import { withMiddleware } from "@/lib/api/middleware";
import { getShopHandler } from "./handlers/get-shop.handler";
import { putShopHandler } from "./handlers/put-shop.handler";
import { patchShopHandler } from "./handlers/patch-shop.handler";
import { deleteShopHandler } from "./handlers/delete-shop.handler";
import { assignSellerHandler } from "./handlers/assign-seller.handler";

export const GET = withMiddleware(getShopHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  skipRateLimitForRoles: ["MALL_OWNER"],
});

export const PUT = withMiddleware(putShopHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  skipRateLimitForRoles: ["MALL_OWNER"],
  auditAction: "SHOP_UPDATED",
});

export const PATCH = withMiddleware(patchShopHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  skipRateLimitForRoles: ["MALL_OWNER"],
  auditAction: "SHOP_UPDATED",
});

export const DELETE = withMiddleware(deleteShopHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  skipRateLimitForRoles: ["MALL_OWNER"],
  auditAction: "SHOP_DELETED",
});

export const POST = withMiddleware(assignSellerHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  skipRateLimitForRoles: ["MALL_OWNER"],
  auditAction: "SHOP_SELLER_CHANGED",
});
