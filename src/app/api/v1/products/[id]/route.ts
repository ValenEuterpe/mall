import { withMiddleware } from "@/lib/api/middleware";
import { getProductDetailHandler } from "./handlers/detail-handler";

export const GET = withMiddleware(getProductDetailHandler, {
  requireAuth: false,
  rateLimit: true,
});
