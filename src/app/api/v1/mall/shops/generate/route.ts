import { NextRequest } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { generateShopsHandler } from "./handlers/generate-shops.handler";

export const POST = withMiddleware(generateShopsHandler, {
    requireAuth: true,
    allowedRoles: ["MALL_OWNER"],
    rateLimit: true,
    skipRateLimitForRoles: ["MALL_OWNER"],
    auditAction: "SHOPS_GENERATED",
});