import { withMiddleware } from "@/lib/api/middleware";
import { getPromotionsHandler } from "./handler";

export const GET = withMiddleware(getPromotionsHandler, {
  requireAuth: false,
  rateLimit: true,
});
