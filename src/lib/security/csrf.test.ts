import { describe, it, expect } from "vitest";
import { generateCsrfToken, requiresCsrfProtection } from "@/lib/security/csrf";

describe("generateCsrfToken", () => {
  it("generates a token of correct length", () => {
    const token = generateCsrfToken();
    expect(token.length).toBe(32);
  });

  it("generates unique tokens each time", () => {
    const tokens = new Set(
      Array.from({ length: 100 }, () => generateCsrfToken())
    );
    expect(tokens.size).toBe(100);
  });
});

describe("requiresCsrfProtection", () => {
  it("returns false for safe methods (GET, HEAD, OPTIONS)", () => {
    expect(requiresCsrfProtection("GET")).toBe(false);
    expect(requiresCsrfProtection("HEAD")).toBe(false);
    expect(requiresCsrfProtection("OPTIONS")).toBe(false);
  });

  it("returns true for unsafe methods (POST, PUT, PATCH, DELETE)", () => {
    expect(requiresCsrfProtection("POST")).toBe(true);
    expect(requiresCsrfProtection("PUT")).toBe(true);
    expect(requiresCsrfProtection("PATCH")).toBe(true);
    expect(requiresCsrfProtection("DELETE")).toBe(true);
  });
});
