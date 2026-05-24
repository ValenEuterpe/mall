import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  StorageError,
  isAppError,
  isOperationalError,
} from "@/lib/errors/custom-errors";

describe("AppError", () => {
  it("creates error with correct properties", () => {
    const err = new AppError("test", 500, "TEST_CODE");
    expect(err.message).toBe("test");
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("TEST_CODE");
    expect(err.isOperational).toBe(true);
    expect(err.name).toBe("AppError");
  });

  it("serializes to JSON", () => {
    const err = new AppError("test", 500, "TEST_CODE", { field: "name" });
    const json = err.toJSON();
    expect(json.code).toBe("TEST_CODE");
    expect(json.message).toBe("test");
    expect(json.details).toEqual({ field: "name" });
  });
});

describe("ValidationError", () => {
  it("has status 400 and code VALIDATION_ERROR", () => {
    const err = new ValidationError("bad input", [{ field: "email" }]);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.details).toEqual([{ field: "email" }]);
  });
});

describe("AuthenticationError", () => {
  it("has status 401 and default message", () => {
    const err = new AuthenticationError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("Authentication required");
  });

  it("accepts custom message", () => {
    const err = new AuthenticationError("Token expired");
    expect(err.message).toBe("Token expired");
  });
});

describe("AuthorizationError", () => {
  it("has status 403", () => {
    const err = new AuthorizationError();
    expect(err.statusCode).toBe(403);
  });
});

describe("NotFoundError", () => {
  it("has status 404 and includes resource name", () => {
    const err = new NotFoundError("Product");
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Product not found");
  });

  it("uses default resource name", () => {
    const err = new NotFoundError();
    expect(err.message).toBe("Resource not found");
  });
});

describe("ConflictError", () => {
  it("has status 409", () => {
    const err = new ConflictError("Email already taken");
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe("Email already taken");
  });
});

describe("RateLimitError", () => {
  it("has status 429", () => {
    const err = new RateLimitError("Too many requests", 60);
    expect(err.statusCode).toBe(429);
    expect(err.retryAfter).toBe(60);
  });
});

describe("DatabaseError", () => {
  it("has status 500 and code DATABASE_ERROR", () => {
    const err = new DatabaseError();
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("DATABASE_ERROR");
  });
});

describe("StorageError", () => {
  it("has status 500 and code STORAGE_ERROR", () => {
    const err = new StorageError();
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("STORAGE_ERROR");
  });
});

describe("isAppError", () => {
  it("returns true for AppError instances", () => {
    expect(isAppError(new ValidationError("test"))).toBe(true);
    expect(isAppError(new AppError("test"))).toBe(true);
  });

  it("returns false for regular Error", () => {
    expect(isAppError(new Error("test"))).toBe(false);
  });

  it("returns false for non-error values", () => {
    expect(isAppError("string")).toBe(false);
    expect(isAppError(null)).toBe(false);
  });
});

describe("isOperationalError", () => {
  it("returns true for AppError (operational)", () => {
    expect(isOperationalError(new ValidationError("test"))).toBe(true);
  });

  it("returns false for regular Error (not operational)", () => {
    expect(isOperationalError(new Error("test"))).toBe(false);
  });
});
