import { withMiddleware } from "@/lib/api/middleware";
import { getProductsHandler } from "./handlers/list-handler";

export const GET = withMiddleware(getProductsHandler, {
  requireAuth: false,
  rateLimit: true,
});
