import { NextRequest } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { importProductsHandler } from "./handlers/import-products.handler";

export const POST = withMiddleware(importProductsHandler, {
    requireAuth: true,
    allowedRoles: ["SELLER"],
    rateLimit: false,
    auditAction: "PRODUCTS_IMPORTED",
});