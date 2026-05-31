// src/lib/validation/schemas/common.ts
// Shared validation schemas to maintain DRY principles

import { z } from "zod";

// ============================================================================
// PASSWORD SCHEMA (Reusable)
// ============================================================================

/**
 * Strong password requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

/**
 * Password with optional special character requirement
 */
export const strongPasswordSchema = passwordSchema.regex(
  /[!@#$%^&*(),.?\":{}|<>]/,
  "Password must contain at least one special character"
);

/**
 * Confirm password refinement helper
 * Use with .refine() or .superRefine() on schemas with password fields
 */
export const passwordConfirmationRefinement = {
  refine: (data: { password: string; confirmPassword: string }) =>
    data.password === data.confirmPassword,
  message: "Passwords don't match",
  path: ["confirmPassword"],
};

/**
 * Helper to create a schema with password confirmation.
 *
 * TypeScript note: Zod's `.extend()` + `.refine()` causes the callback parameter
 * to be widened in some generic cases. We constrain the input shape to include
 * a `password` field, and we keep runtime behavior strict.
 */
export function withPasswordConfirmation<
  T extends z.ZodRawShape & { password: z.ZodTypeAny },
>(schema: z.ZodObject<T>) {
  return schema
    .extend({
      confirmPassword: z.string(),
    })
    .refine(
      (data) =>
        (data as unknown as { password: string; confirmPassword: string })
          .password ===
        (data as unknown as { password: string; confirmPassword: string })
          .confirmPassword,
      {
        message: "Passwords don't match",
        path: ["confirmPassword"],
      }
    );
}

// ============================================================================
// EMAIL SCHEMA
// ============================================================================

/**
 * Standard email validation
 */
export const emailSchema = z
  .string()
  .email("Invalid email address")
  .toLowerCase()
  .trim();

/**
 * Email object schema (for request bodies)
 */
export const emailObjectSchema = z.object({
  email: emailSchema,
});

// ============================================================================
// PAGINATION SCHEMAS
// ============================================================================

/**
 * Standard pagination parameters
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * Cursor-based pagination
 */
export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================================================
// SEARCH & SORT SCHEMAS
// ============================================================================

/**
 * Search with pagination
 */
export const searchSchema = z.object({
  query: z.string().min(1).max(100),
  ...paginationSchema.shape,
});

/**
 * Sort parameters
 */
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ============================================================================
// ID SCHEMAS
// ============================================================================

/**
 * CUID ID parameter
 */
export const idSchema = z.object({
  id: z.string().cuid("Invalid ID format"),
});

/**
 * UUID parameter (if needed)
 */
export const uuidSchema = z.object({
  id: z.string().uuid("Invalid UUID format"),
});

// ============================================================================
// FILTER SCHEMAS
// ============================================================================

/**
 * Boolean string filter (from query params)
 */
export const booleanFilterSchema = z.enum(["true", "false"]).optional();

/**
 * Transform boolean filter to actual boolean
 */
export const booleanFilter = z
  .enum(["true", "false"])
  .optional()
  .transform((val) => (val === undefined ? undefined : val === "true"));

/**
 * Date range filter
 */
export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// ============================================================================
// COMMON FIELD SCHEMAS
// ============================================================================

/**
 * Phone number (basic validation)
 */
export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s-()]+$/, "Invalid phone number format")
  .min(7)
  .max(20)
  .optional();

/**
 * URL validation
 */
export const urlSchema = z.string().url("Invalid URL format").optional();

/**
 * Slug validation
 */
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format")
  .min(2)
  .max(100);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type PaginationInput = z.infer<typeof paginationSchema>;
export type CursorPaginationInput = z.infer<typeof cursorPaginationSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type SortInput = z.infer<typeof sortSchema>;
export type IdInput = z.infer<typeof idSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
