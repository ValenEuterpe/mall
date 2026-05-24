// Set up environment variables for tests BEFORE importing anything else
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_jwt_secret_key_for_testing_only";
process.env.JWT_REFRESH_SECRET = "test_jwt_refresh_secret_for_testing_only";
process.env.NEXT_PUBLIC_APP_NAME = "Wholesale Market Test";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock the logger FIRST to avoid env variable access issues
vi.mock("@/lib/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  maskEmail: (email: string) => email,
}));

// Mock Prisma client - tests don't need real DB
// Create classes that can be instantiated for instanceof checks
class MockPrismaClientKnownRequestError extends Error {
  code: string = "P0001";
  meta?: unknown;

  constructor(message: string, code: string = "P0001", meta?: unknown) {
    super(message);
    this.code = code;
    this.meta = meta;
  }
}

class MockPrismaClientInitializationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

vi.mock("@/prisma/generated/client", () => ({
  PrismaClient: vi.fn(() => ({})),
  Prisma: {
    PrismaClientKnownRequestError: MockPrismaClientKnownRequestError,
    PrismaClientInitializationError: MockPrismaClientInitializationError,
  },
}));

// Mock next/headers for tests
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));
