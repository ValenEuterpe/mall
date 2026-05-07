import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "@/prisma/generated/client";
import { createErrorResponse, createSuccessResponse } from "@/app/response";
import prisma from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/types/auth";
import { addFavoriteSchema } from "../schemas";

export async function POST(
  request: NextRequest,
  { user }: { params: Promise<unknown>; user: AuthenticatedUser }
): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = addFavoriteSchema.safeParse(body);

  if (!parsed.success) {
    return createErrorResponse(
      "VALIDATION_ERROR",
      "Invalid request body",
      400,
      { details: parsed.error.flatten() }
    );
  }

  const { productId } = parsed.data;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, status: true, isActive: true },
  });

  if (!product) {
    return createErrorResponse("NOT_FOUND", "Product not found", 404);
  }

  if (product.status !== "PUBLISHED" || !product.isActive) {
    return createErrorResponse(
      "BAD_REQUEST",
      "Cannot favorite a product that is not published",
      400
    );
  }

  try {
    const favorite = await prisma.favorite.create({
      data: {
        ownerId: user.userId,
        ownerRole: user.role,
        productId,
      },
    });

    return createSuccessResponse(
      {
        id: favorite.id,
        productId: favorite.productId,
        createdAt: favorite.createdAt,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return createErrorResponse(
        "CONFLICT",
        "Product is already in your favorites",
        409
      );
    }
    throw error;
  }
}
