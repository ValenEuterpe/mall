import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { requireAuth } from "@/lib/api/auth-helper";
import { AuthorizationError, NotFoundError } from "@/lib/errors/custom-errors";
import type { AuthenticatedUser, UserRole } from "@/types/auth";

// ============================================================================
// RESOURCE OWNERSHIP VALIDATORS
// ============================================================================

/**
 * Verify that the authenticated seller owns a specific product
 *
 * @param request - The Next.js request object
 * @param productId - The ID of the product to verify ownership
 * @returns The product with shop and seller information
 * @throws {NotFoundError} If product doesn't exist
 * @throws {AuthorizationError} If user doesn't own the product
 *
 * @example
 * ```typescript
 * const product = await requireProductOwnership(request, productId);
 * // Product exists and user owns it
 * ```
 */
export async function requireProductOwnership(
  request: NextRequest,
  productId: string
): Promise<{
  id: string;
  shopId: string;
  shop: { sellerId: string | null };
}> {
  const user = requireAuth(request, ["SELLER"]);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      shopId: true,
      shop: {
        select: {
          sellerId: true,
        },
      },
    },
  });

  if (!product) {
    throw new NotFoundError("Product");
  }

  if (product.shop?.sellerId !== user.userId) {
    throw new AuthorizationError(
      "You do not have permission to access this product"
    );
  }

  return product;
}

/**
 * Verify that the authenticated seller owns a specific shop
 *
 * @param request - The Next.js request object
 * @param shopId - The ID of the shop to verify ownership
 * @returns The shop with seller information
 * @throws {NotFoundError} If shop doesn't exist
 * @throws {AuthorizationError} If user doesn't own the shop
 *
 * @example
 * ```typescript
 * const shop = await requireShopOwnership(request, shopId);
 * // Shop exists and user owns it
 * ```
 */
export async function requireShopOwnership(
  request: NextRequest,
  shopId: string
): Promise<{
  id: string;
  sellerId: string | null;
}> {
  const user = requireAuth(request, ["SELLER"]);

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      id: true,
      sellerId: true,
    },
  });

  if (!shop) {
    throw new NotFoundError("Shop");
  }

  if (shop.sellerId !== user.userId) {
    throw new AuthorizationError(
      "You do not have permission to access this shop"
    );
  }

  return shop;
}

/**
 * Generic ownership verification for any resource with an owner field
 *
 * Provides a flexible way to verify ownership for resources that follow
 * a standard pattern (e.g., having an ownerId, sellerId, userId field)
 *
 * @param user - The authenticated user object
 * @param resourceId - The ID of the resource to verify
 * @param model - The Prisma model to query
 * @param ownerField - The field name representing the owner ID
 * @param allowedRoles - Optional array of roles allowed to own this resource
 * @returns The resource object if ownership is verified
 * @throws {NotFoundError} If resource doesn't exist
 * @throws {AuthorizationError} If user doesn't own the resource or lacks required role
 *
 * @example
 * ```typescript
 * // Verify a seller owns a specific product
 * const product = await requireGenericOwnership(
 *   user,
 *   productId,
 *   prisma.product,
 *   'sellerId',
 *   ['SELLER']
 * );
 * ```
 */
export async function requireGenericOwnership<
  T extends { id: string; [key: string]: any },
>(
  user: AuthenticatedUser,
  resourceId: string,
  model: {
    findUnique: (options: {
      where: { id: string };
      select: any;
    }) => Promise<T | null>;
  },
  ownerField: keyof T,
  allowedRoles?: UserRole[]
): Promise<T> {
  // Verify role if roles are specified
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new AuthorizationError(
      "You are not authorized to own this type of resource"
    );
  }

  // Fetch the resource
  const resource = await model.findUnique({
    where: { id: resourceId },
    select: { id: true, [ownerField]: true },
  });

  if (!resource) {
    throw new NotFoundError("Resource");
  }

  // Verify ownership
  if (resource[ownerField] !== user.userId) {
    throw new AuthorizationError(
      "You do not have permission to access this resource"
    );
  }

  return resource;
}

/**
 * Check if a user owns a resource without throwing errors
 *
 * Useful for conditional logic where you want to check ownership
 * but handle the result without exceptions
 *
 * @param user - The authenticated user object
 * @param resourceId - The ID of the resource
 * @param model - The Prisma model to query
 * @param ownerField - The field name representing the owner ID
 * @returns True if user owns the resource, false otherwise
 *
 * @example
 * ```typescript
 * const canEdit = await checkOwnership(user, productId, prisma.product, 'sellerId');
 * if (canEdit) {
 *   // Allow editing
 * }
 * ```
 */
export async function checkResourceOwnership<
  T extends { id: string; [key: string]: any },
>(
  user: AuthenticatedUser,
  resourceId: string,
  model: {
    findUnique: (options: {
      where: { id: string };
      select: any;
    }) => Promise<T | null>;
  },
  ownerField: keyof T
): Promise<boolean> {
  try {
    const resource = await model.findUnique({
      where: { id: resourceId },
      select: { id: true, [ownerField]: true },
    });

    if (!resource) {
      return false;
    }

    return resource[ownerField] === user.userId;
  } catch (_error) {
    return false;
  }
}
