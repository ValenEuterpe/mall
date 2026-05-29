import { withMiddleware } from "@/lib/api/middleware";
import { getMapHandler } from "./handlers/get-map.handler";
import { postMapHandler } from "./handlers/post-map.handler";
import { deleteMapHandler } from "./handlers/delete-map.handler";

export const GET = withMiddleware(getMapHandler, {
    requireAuth: false,
    rateLimit: true,
});

export const POST = withMiddleware(postMapHandler, {
    requireAuth: true,
    allowedRoles: ["MALL_OWNER"],
    rateLimit: true,
    auditAction: "MAP_UPLOADED",
});

export const DELETE = withMiddleware(deleteMapHandler, {
    requireAuth: true,
    allowedRoles: ["MALL_OWNER"],
    rateLimit: true,
    auditAction: "MAP_DELETED",
});