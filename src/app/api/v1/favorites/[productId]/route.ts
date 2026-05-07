import { NextRequest, NextResponse } from "next/server";

import { withMiddleware } from "@/lib/api/middleware";
import { methodNotAllowed } from "@/lib/api/response";
import { createErrorResponse, createSuccessResponse } from "@/app/response";
import prisma from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/types/auth";

async function removeFavoriteHandler(
  request: NextRequest,
  { params, user }: { params: Promise<{ productId: string }>; user: AuthenticatedUser }
): Promise<NextResponse> {
  const { productId } = await params;

  const deleted = await prisma.favorite.deleteMany({
    where: {
      ownerId: user.userId,
      productId,
    },
  });

  if (deleted.count === 0) {
    return createErrorResponse("NOT_FOUND", "Favorite not found", 404);
  }

  return createSuccessResponse({
    message: "Product removed from favorites",
    productId,
  });
}

export const DELETE = withMiddleware(removeFavoriteHandler, {
  requireAuth: true,
  allowedRoles: ["USER", "SELLER", "MALL_OWNER"],
  rateLimit: true,
});

export const GET = (): ReturnType<typeof methodNotAllowed> =>
  methodNotAllowed(["DELETE"]);

export const POST = (): ReturnType<typeof methodNotAllowed> =>
  methodNotAllowed(["DELETE"]);

export const PATCH = (): ReturnType<typeof methodNotAllowed> =>
  methodNotAllowed(["DELETE"]);
