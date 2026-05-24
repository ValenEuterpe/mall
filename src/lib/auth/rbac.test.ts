import { describe, it, expect } from "vitest";
import {
  hasPermission,
  canAccess,
  getRolePermissions,
  hasResourceAccess,
  checkOwnership,
} from "@/lib/auth/rbac";

describe("hasPermission", () => {
  it("USER can read products", () => {
    expect(hasPermission("USER", "products", "read")).toBe(true);
  });

  it("USER cannot create products", () => {
    expect(hasPermission("USER", "products", "create")).toBe(false);
  });

  it("USER cannot delete products", () => {
    expect(hasPermission("USER", "products", "delete")).toBe(false);
  });

  it("SELLER can create products", () => {
    expect(hasPermission("SELLER", "products", "create")).toBe(true);
  });

  it("SELLER can update products", () => {
    expect(hasPermission("SELLER", "products", "update")).toBe(true);
  });

  it("SELLER can delete products", () => {
    expect(hasPermission("SELLER", "products", "delete")).toBe(true);
  });

  it("SELLER cannot manage system", () => {
    expect(hasPermission("SELLER", "system", "manage")).toBe(false);
  });

  it("MALL_OWNER can manage system", () => {
    expect(hasPermission("MALL_OWNER", "system", "manage")).toBe(true);
  });

  it("MALL_OWNER can invite sellers", () => {
    expect(hasPermission("MALL_OWNER", "sellers", "invite")).toBe(true);
  });

  it("MALL_OWNER can manage maps", () => {
    expect(hasPermission("MALL_OWNER", "maps", "create")).toBe(true);
    expect(hasPermission("MALL_OWNER", "maps", "update")).toBe(true);
    expect(hasPermission("MALL_OWNER", "maps", "delete")).toBe(true);
  });
});

describe("canAccess", () => {
  it("delegates to hasPermission", () => {
    expect(canAccess("USER", "products", "read")).toBe(true);
    expect(canAccess("USER", "products", "create")).toBe(false);
  });
});

describe("getRolePermissions", () => {
  it("returns permissions for known roles", () => {
    const userPerms = getRolePermissions("USER");
    expect(userPerms.length).toBeGreaterThan(0);
    expect(userPerms.some((p) => p.resource === "products")).toBe(true);
  });

  it("returns empty array for unknown role string passed as UserRole", () => {
    expect(getRolePermissions("UNKNOWN_ROLE" as any)).toEqual([]);
  });
});

describe("hasResourceAccess", () => {
  it("returns true if role has any permission for the resource", () => {
    expect(hasResourceAccess("SELLER", "products")).toBe(true);
  });

  it("returns false if role has no permission for the resource", () => {
    expect(hasResourceAccess("USER", "system")).toBe(false);
  });
});

describe("checkOwnership", () => {
  it("returns true when userId matches resourceOwnerId", () => {
    expect(checkOwnership("user1", "user1")).toBe(true);
  });

  it("returns false when userId differs from resourceOwnerId", () => {
    expect(checkOwnership("user1", "user2")).toBe(false);
  });
});
