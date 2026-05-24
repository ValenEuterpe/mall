import type { AuthenticatedUser, UserRole } from "@/types/auth";

export function createMockUser(
  overrides?: Partial<AuthenticatedUser>
): AuthenticatedUser {
  return {
    userId: "user_test123",
    email: "test@example.com",
    role: "USER" as UserRole,
    ...overrides,
  };
}

export function createMockSeller(
  overrides?: Partial<AuthenticatedUser>
): AuthenticatedUser {
  return createMockUser({
    userId: "seller_test123",
    email: "seller@example.com",
    role: "SELLER" as UserRole,
    ...overrides,
  });
}

export function createMockMallOwner(
  overrides?: Partial<AuthenticatedUser>
): AuthenticatedUser {
  return createMockUser({
    userId: "mallowner_test123",
    email: "mallowner@example.com",
    role: "MALL_OWNER" as UserRole,
    ...overrides,
  });
}
