import { NextRequest } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { listCategoriesHandler } from "./handlers/list-categories.handler";

export const GET = withMiddleware(listCategoriesHandler, {
    requireAuth: false,
    rateLimit: true,
});