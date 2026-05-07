// src/lib/services/auth/account-lookup.service.ts

import type { FoundAccount, UserRole } from "@/types/auth";
import prisma from "@/lib/db/prisma";
import { maskEmail } from "@/lib/utils/email";
import { logger } from "@/lib/utils/logger";
import type {
  AccountType,
  AccountLookupResult,
  UserAccountInfo,
  SellerAccountInfo,
  MallOwnerAccountInfo,
} from "@/types/auth";

// ============================================================================
// INDIVIDUAL TABLE LOOKUP FUNCTIONS
// ============================================================================

/**
 * Check User table for email
 */
async function checkUserTable(email: string): Promise<AccountLookupResult> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      emailVerified: true,
      isActive: true,
    },
  });

  if (!user) {
    return { found: false, type: null, info: null };
  }

  const info: UserAccountInfo = {
    type: "USER",
    needsVerification: !user.emailVerified,
    isActive: user.isActive,
  };

  return { found: true, type: "USER", info };
}

/**
 * Check Seller table for email
 */
async function checkSellerTable(email: string): Promise<AccountLookupResult> {
  const seller = await prisma.seller.findUnique({
    where: { email },
    select: {
      id: true,
      password: true,
      isActive: true,
      isVerified: true,
    },
  });

  if (!seller) {
    return { found: false, type: null, info: null };
  }

  const info: SellerAccountInfo = {
    type: "SELLER",
    needsSetup: !seller.password,
    isActive: seller.isActive,
    status: seller.isVerified ? "VERIFIED" : "PENDING",
  };

  return { found: true, type: "SELLER", info };
}

/**
 * Check MallOwner table for email
 */
async function checkMallOwnerTable(
  email: string
): Promise<AccountLookupResult> {
  const mallOwner = await prisma.mallOwner.findUnique({
    where: { email },
    select: {
      id: true,
    },
  });

  if (!mallOwner) {
    return { found: false, type: null, info: null };
  }

  const info: MallOwnerAccountInfo = {
    type: "MALL_OWNER",
    isActive: true,
  };

  return { found: true, type: "MALL_OWNER", info };
}

// ============================================================================
// MAIN LOOKUP FUNCTIONS
// ============================================================================

/**
 * Check all tables for email existence using parallel queries
 * Best for: When you expect emails to be distributed across tables
 *
 * @param email - Normalized email address to look up
 * @returns Account lookup result
 */
export async function findAccountByEmail(
  email: string
): Promise<AccountLookupResult> {
  const [userResult, sellerResult, mallOwnerResult] = await Promise.all([
    checkUserTable(email),
    checkSellerTable(email),
    checkMallOwnerTable(email),
  ]);

  // Return first found result (priority order)
  if (userResult.found) return userResult;
  if (sellerResult.found) return sellerResult;
  if (mallOwnerResult.found) return mallOwnerResult;

  return { found: false, type: null, info: null };
}

/**
 * Check tables sequentially - stops at first match
 * Best for: When most emails are expected to be regular users
 *
 * @param email - Normalized email address to look up
 * @returns Account lookup result
 */
export async function findAccountByEmailSequential(
  email: string
): Promise<AccountLookupResult> {
  // Check User first (most common)
  const userResult = await checkUserTable(email);
  if (userResult.found) return userResult;

  // Check Seller
  const sellerResult = await checkSellerTable(email);
  if (sellerResult.found) return sellerResult;

  // Check MallOwner (least common)
  const mallOwnerResult = await checkMallOwnerTable(email);
  if (mallOwnerResult.found) return mallOwnerResult;

  return { found: false, type: null, info: null };
}

/**
 * Check only specific account types
 *
 * @param email - Normalized email address to look up
 * @param types - Array of account types to check
 * @returns Account lookup result
 */
export async function findAccountByEmailForTypes(
  email: string,
  types: AccountType[]
): Promise<AccountLookupResult> {
  const lookupMap: Record<AccountType, () => Promise<AccountLookupResult>> = {
    USER: () => checkUserTable(email),
    SELLER: () => checkSellerTable(email),
    MALL_OWNER: () => checkMallOwnerTable(email),
  };

  const results = await Promise.all(types.map((type) => lookupMap[type]()));

  return (
    results.find((r) => r.found) ?? { found: false, type: null, info: null }
  );
}

// ============================================================================
// LOGGING UTILITY
// ============================================================================

/**
 * Log email check for monitoring (with privacy protection)
 */
export function logEmailCheck(
  email: string,
  ip: string,
  exists: boolean,
  accountType: AccountType | null
): void {
  if (process.env.NODE_ENV === "development") {
    logger.info("Email check", {
      email: maskEmail(email),
      ip,
      exists,
      accountType,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Find account by email across all account types
 * Returns a unified FoundAccount structure
 */
export async function findFoundAccountByEmail(
  email: string
): Promise<FoundAccount | null> {
  // Check User table
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      firstName: true,
      lastName: true,
      isActive: true,
    },
  });

  if (user) {
    return {
      id: user.id,
      email: user.email,
      password: user.password,
      isActive: user.isActive,
      type: "USER",
      displayName: `${user.firstName} ${user.lastName}`.trim() || "User",
    };
  }

  // Check Seller table
  const seller = await prisma.seller.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      businessName: true,
      isActive: true,
    },
  });

  if (seller) {
    return {
      id: seller.id,
      email: seller.email,
      password: seller.password,
      isActive: seller.isActive,
      type: "SELLER",
      displayName: seller.businessName || "Seller",
    };
  }

  // Check MallOwner table
  const mallOwner = await prisma.mallOwner.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      name: true,
    },
  });

  if (mallOwner) {
    return {
      id: mallOwner.id,
      email: mallOwner.email,
      password: mallOwner.password,
      isActive: true, // MallOwner doesn't have isActive field based on earlier code
      type: "MALL_OWNER",
      displayName: mallOwner.name || "Mall Owner",
    };
  }

  return null;
}

/**
 * Find account by ID and role
 */
export async function findFoundAccountById(
  id: string,
  role: UserRole
): Promise<FoundAccount | null> {
  switch (role) {
    case "USER": {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          password: true,
          firstName: true,
          lastName: true,
          isActive: true,
        },
      });
      if (!user) return null;
      return {
        id: user.id,
        email: user.email,
        password: user.password,
        isActive: user.isActive,
        type: "USER",
        displayName: `${user.firstName} ${user.lastName}`.trim() || "User",
      };
    }

    case "SELLER": {
      const seller = await prisma.seller.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          password: true,
          businessName: true,
          isActive: true,
        },
      });
      if (!seller) return null;
      return {
        id: seller.id,
        email: seller.email,
        password: seller.password,
        isActive: seller.isActive,
        type: "SELLER",
        displayName: seller.businessName || "Seller",
      };
    }

    case "MALL_OWNER": {
      const mallOwner = await prisma.mallOwner.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          password: true,
          name: true,
        },
      });
      if (!mallOwner) return null;
      return {
        id: mallOwner.id,
        email: mallOwner.email,
        password: mallOwner.password,
        isActive: true,
        type: "MALL_OWNER",
        displayName: mallOwner.name || "Mall Owner",
      };
    }

    default:
      return null;
  }
}
