import prisma from "@/lib/db/prisma";
import { Prisma } from "@/prisma/generated/client";
import { logger } from "@/lib/utils/logger";
import type { UserRole } from "@/types/auth";

// NOTE: Prisma model `AuditLog.action` is a String in schema.
// We keep this union for type-safety and consistency across API middleware.
export type AuditAction =
  // Authentication
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "USER_SIGNUP"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"
  | "EMAIL_VERIFIED"
  // Seller
  | "SELLER_INVITED"
  | "SELLER_SETUP"
  | "SELLER_LOGIN"
  | "SELLER_UPDATED"
  | "SELLER_DELETED"
  // Mall owner
  | "MALL_OWNER_LOGIN"
  | "MALL_OWNER_MAGIC_LINK_REQUESTED"
  // Products
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_DELETED"
  | "PRODUCT_PUBLISHED"
  | "PRODUCT_UNPUBLISHED"
  | "PRODUCTS_IMPORTED"
  | "PRODUCTS_EXPORTED"
  // Shops
  | "SHOP_CREATED"
  | "SHOP_UPDATED"
  | "SHOP_DELETED"
  | "SHOP_SELLER_CHANGED"
  | "SHOPS_GENERATED"
  // Maps
  | "MAP_UPLOADED"
  | "MAP_DELETED"
  // Shop Types
  | "SHOP_TYPE_CREATED"
  | "SHOP_TYPE_UPDATED"
  | "SHOP_TYPE_DELETED"
  // Categories (admin)
  | "CATEGORY_CREATED"
  | "CATEGORY_UPDATED"
  | "CATEGORY_DELETED"
  // Uploads
  | "FILE_UPLOADED";

export interface CreateAuditLogInput {
  action: AuditAction;
  userId?: string | null;
  userEmail?: string | null;
  userRole?: UserRole | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown> | null;
  success?: boolean;
  errorMessage?: string | null;
}

export function getAuditInfo(request: Request): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const headers = request.headers;

  const userAgent = headers.get("user-agent");

  // Prefer standard reverse-proxy header
  const forwardedFor = headers.get("x-forwarded-for");
  const ipAddress = forwardedFor ? forwardedFor.split(",")[0]?.trim() : null;

  return { ipAddress, userAgent };
}

/**
 * Creates an audit log entry. This should be called in a fire-and-forget way.
 */
export async function createAuditLog(
  input: CreateAuditLogInput
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        userId: input.userId ?? null,
        userEmail: input.userEmail ?? null,
        userRole: input.userRole ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        details: (input.details ?? undefined) as Prisma.InputJsonValue,
        success: input.success ?? true,
        errorMessage: input.errorMessage ?? null,
      },
    });
  } catch (error) {
    // Audit logging must never fail the request.
    logger.warn("Failed to create audit log", {
      action: input.action,
      userId: input.userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Cleanup helper for cron jobs.
 */
export async function cleanupOldAuditLogs(daysToKeep = 90): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);

  const result = await prisma.auditLog.deleteMany({
    where: {
      createdAt: { lt: cutoff },
    },
  });

  return result.count;
}
