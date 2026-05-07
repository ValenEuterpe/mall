import { withMiddleware } from "@/lib/api/middleware";

import { getSellerHandler } from "./handlers/get-seller.handler";
import { putSellerHandler } from "./handlers/put-seller.handler";
import { patchSellerHandler } from "./handlers/patch-seller.handler";
import { deleteSellerHandler } from "./handlers/delete-seller.handler";

export const GET = withMiddleware(getSellerHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  skipRateLimitForRoles: ["SELLER", "MALL_OWNER"],
});

export const PUT = withMiddleware(putSellerHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  skipRateLimitForRoles: ["SELLER", "MALL_OWNER"],
  auditAction: "SELLER_UPDATED",
});

export const PATCH = withMiddleware(patchSellerHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  skipRateLimitForRoles: ["SELLER", "MALL_OWNER"],
  auditAction: "SELLER_UPDATED",
});

export const DELETE = withMiddleware(deleteSellerHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  skipRateLimitForRoles: ["SELLER", "MALL_OWNER"],
  auditAction: "SELLER_DELETED",
});
