import { NextRequest, NextResponse } from "next/server";

import { requireAuth, AuthError } from "@/lib/api/auth-helper";
import { createErrorResponse, createSuccessResponse, methodNotAllowed } from "@/app/response";
import prisma from "@/lib/db/prisma";
import { enforceRateLimit, publicReadRateLimiter } from "@/lib/utils/rate-limit";
import { mapSelectionPayloadSchema } from "./schemas";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireAuth(request);
    const limited = enforceRateLimit(request, publicReadRateLimiter, user.userId);
    if (limited) return limited.response;

    // Map selection is currently supported only for regular customers.
    if (user.role !== "USER") {
      return createErrorResponse(
        "FORBIDDEN",
        "Map selection is only available for customers",
        403
      );
    }

    // NOTE: Prisma client types in this workspace may be stale if `prisma generate` isn't available.
    // We keep the runtime behavior correct and suppress TS on the new field.
    const dbUser = (await prisma.user.findUnique({
      where: { id: user.userId },
      select: { mapSelectionProductIds: true },
    })) as unknown as { mapSelectionProductIds: string[] } | null;

    return createSuccessResponse({
      productIds: dbUser?.mapSelectionProductIds ?? [],
    });
  } catch (error) {
    if (error instanceof AuthError) return error.toResponse();
    console.error("Unexpected error in GET /api/v1/map-selection:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred",
      500
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireAuth(request);
    const limited = enforceRateLimit(request, publicReadRateLimiter, user.userId);
    if (limited) return limited.response;

    if (user.role !== "USER") {
      return createErrorResponse(
        "FORBIDDEN",
        "Map selection is only available for customers",
        403
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = mapSelectionPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        { details: parsed.error.flatten() }
      );
    }

    // De-dupe while preserving order
    const productIds = Array.from(new Set(parsed.data.productIds));

    await prisma.user.update({
      where: { id: user.userId },
      data: { mapSelectionProductIds: productIds },
      select: { id: true },
    });

    return createSuccessResponse({ productIds });
  } catch (error) {
    if (error instanceof AuthError) return error.toResponse();
    console.error("Unexpected error in PUT /api/v1/map-selection:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred",
      500
    );
  }
}

export const POST = () => methodNotAllowed(["GET", "PUT"]);
export const DELETE = () => methodNotAllowed(["GET", "PUT"]);
export const PATCH = () => methodNotAllowed(["GET", "PUT"]);
