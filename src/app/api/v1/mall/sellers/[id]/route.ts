import { withMiddleware } from "@/lib/api/middleware";

// Reuse the existing sellers implementation.
// Mall-owner seller detail/actions are already implemented under `/api/v1/sellers/[id]`.
import { getSellerHandler } from "@/app/api/v1/sellers/[id]/handlers/get-seller.handler";
import { putSellerHandler } from "@/app/api/v1/sellers/[id]/handlers/put-seller.handler";
import { patchSellerHandler } from "@/app/api/v1/sellers/[id]/handlers/patch-seller.handler";
import { deleteSellerHandler } from "@/app/api/v1/sellers/[id]/handlers/delete-seller.handler";

export const GET = withMiddleware(getSellerHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  skipRateLimitForRoles: ["MALL_OWNER"],
});

export const PUT = withMiddleware(putSellerHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  skipRateLimitForRoles: ["MALL_OWNER"],
  auditAction: "SELLER_UPDATED",
});

export const PATCH = withMiddleware(patchSellerHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  skipRateLimitForRoles: ["MALL_OWNER"],
  auditAction: "SELLER_UPDATED",
});

export const DELETE = withMiddleware(deleteSellerHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
  skipRateLimitForRoles: ["MALL_OWNER"],
  auditAction: "SELLER_DELETED",
});
