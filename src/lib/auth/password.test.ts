import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  isPasswordStrong,
} from "@/lib/auth/password";

describe("hashPassword", () => {
  it("produces a bcrypt hash", async () => {
    const hash = await hashPassword("testPassword123!");
    expect(hash).toMatch(/^\$2[aby]?\$/);
    expect(hash).not.toBe("testPassword123!");
  });

  it("produces different hashes for same password (different salts)", async () => {
    const hash1 = await hashPassword("samePassword1!");
    const hash2 = await hashPassword("samePassword1!");
    expect(hash1).not.toBe(hash2);
  });
});

describe("verifyPassword", () => {
  it("returns true for correct password", async () => {
    const hash = await hashPassword("correctPassword1!");
    const result = await verifyPassword("correctPassword1!", hash);
    expect(result).toBe(true);
  });

  it("returns false for incorrect password", async () => {
    const hash = await hashPassword("correctPassword1!");
    const result = await verifyPassword("wrongPassword1!", hash);
    expect(result).toBe(false);
  });
});

describe("isPasswordStrong", () => {
  it("accepts passwords meeting all requirements", () => {
    expect(isPasswordStrong("Abcdef1!")).toBe(true);
    expect(isPasswordStrong("StrongP@ss1")).toBe(true);
  });

  it("rejects passwords shorter than 8 characters", () => {
    expect(isPasswordStrong("Ab1!")).toBe(false);
  });

  it("rejects passwords without uppercase", () => {
    expect(isPasswordStrong("abcdef1!")).toBe(false);
  });

  it("rejects passwords without lowercase", () => {
    expect(isPasswordStrong("ABCDEF1!")).toBe(false);
  });

  it("rejects passwords without numbers", () => {
    expect(isPasswordStrong("Abcdefg!")).toBe(false);
  });

  it("rejects passwords without special characters", () => {
    expect(isPasswordStrong("Abcdef12")).toBe(false);
  });
});
