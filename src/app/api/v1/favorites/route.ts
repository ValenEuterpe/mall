import { withMiddleware } from "@/lib/api/middleware";
import { methodNotAllowed } from "@/lib/api/response";
import { GET as getFavoritesHandler, POST as addFavoriteHandler } from "./handlers";

export const GET = withMiddleware(getFavoritesHandler, {
  requireAuth: true,
  allowedRoles: ["USER", "SELLER", "MALL_OWNER"],
  rateLimit: true,
});

export const POST = withMiddleware(addFavoriteHandler, {
  requireAuth: true,
  allowedRoles: ["USER", "SELLER", "MALL_OWNER"],
  rateLimit: true,
});

export const DELETE = (): ReturnType<typeof methodNotAllowed> =>
  methodNotAllowed(["GET", "POST"]);

export const PATCH = (): ReturnType<typeof methodNotAllowed> =>
  methodNotAllowed(["GET", "POST"]);
