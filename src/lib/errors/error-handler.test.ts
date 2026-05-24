import { describe, it, expect } from "vitest";
import { handleError } from "@/lib/errors/error-handler";
import {
  AppError,
  ValidationError,
  RateLimitError,
  NotFoundError,
} from "@/lib/errors/custom-errors";
import { ZodError, ZodIssue } from "zod";

describe("handleError", () => {
  it("handles AppError with correct status and body", async () => {
    const err = new NotFoundError("Product");
    const res = handleError(err);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("Product not found");
  });

  it("handles ValidationError with details", async () => {
    const err = new ValidationError("Invalid fields", [{ field: "email" }]);
    const res = handleError(err);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("adds Retry-After header for RateLimitError", () => {
    const err = new RateLimitError("Too many requests", 60);
    const res = handleError(err);

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("handles ZodError with formatted field errors", async () => {
    const issues: ZodIssue[] = [
      {
        code: "custom",
        message: "Invalid email",
        path: ["email"],
      },
    ];
    const err = new ZodError(issues);
    const res = handleError(err);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toEqual([
      { field: "email", message: "Invalid email" },
    ]);
  });

  it("handles unknown errors with 500 status", async () => {
    const err = new Error("something broke");
    const res = handleError(err);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});
