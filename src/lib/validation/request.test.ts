import { describe, it, expect } from "vitest";
import {
  paginationSchema,
  sortSchema,
  uuidParamSchema,
  validateRequestBody,
} from "@/lib/validation/request";
import { ValidationError } from "@/lib/errors/custom-errors";

describe("paginationSchema", () => {
  it("accepts valid pagination params", () => {
    const result = paginationSchema.safeParse({ page: 1, limit: 20 });
    expect(result.success).toBe(true);
  });

  it("defaults page to 1 when omitted", () => {
    const result = paginationSchema.safeParse({ limit: 20 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
    }
  });

  it("defaults limit to 20 when omitted", () => {
    const result = paginationSchema.safeParse({ page: 1 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });

  it("rejects page less than 1", () => {
    const result = paginationSchema.safeParse({ page: 0, limit: 20 });
    expect(result.success).toBe(false);
  });

  it("rejects limit greater than 100", () => {
    const result = paginationSchema.safeParse({ page: 1, limit: 200 });
    expect(result.success).toBe(false);
  });

  it("coerces string numbers to integers", () => {
    const result = paginationSchema.safeParse({ page: "3", limit: "10" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(10);
    }
  });
});

describe("sortSchema", () => {
  it("accepts valid sort params", () => {
    const result = sortSchema.safeParse({ sortBy: "name", sortOrder: "asc" });
    expect(result.success).toBe(true);
  });

  it("defaults sortOrder to desc", () => {
    const result = sortSchema.safeParse({ sortBy: "name" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortOrder).toBe("desc");
    }
  });

  it("rejects invalid sortOrder", () => {
    const result = sortSchema.safeParse({ sortOrder: "invalid" });
    expect(result.success).toBe(false);
  });
});

describe("uuidParamSchema", () => {
  it("accepts valid UUIDs", () => {
    const result = uuidParamSchema.safeParse({ id: "clx1234567890abcdefg" });
    expect(result.success).toBe(true);
  });

  it("rejects empty string", () => {
    const result = uuidParamSchema.safeParse({ id: "" });
    expect(result.success).toBe(false);
  });
});

describe("validateRequestBody", () => {
  it("returns success for valid data", () => {
    const schema = paginationSchema;
    const result = validateRequestBody(schema, { page: 1, limit: 20 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
    }
  });

  it("returns ValidationError for invalid data", () => {
    const result = validateRequestBody(paginationSchema, {
      page: -1,
      limit: 999,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });
});
