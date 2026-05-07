// src/lib/validation/schemas/auth.ts
// Authentication validation schemas using shared base schemas

import { z } from "zod";
import {
  passwordSchema,
  emailSchema,
  withPasswordConfirmation,
} from "./common";

// Re-export base schemas for consumers that import from this module
export { emailSchema, passwordSchema };

// ============================================================================
// USER (Customer) SCHEMAS
// ============================================================================

const userSignupBase = z.object({
  email: emailSchema,
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  password: passwordSchema,
  locale: z.string().min(2).max(5).optional(),
});

export const userSignupSchema = withPasswordConfirmation(userSignupBase);

export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

// ============================================================================
// SELLER SCHEMAS
// ============================================================================

export const sellerInviteSchema = z.object({
  email: emailSchema,
  shopId: z.string().cuid("Invalid shop ID"),
  businessName: z.string().min(2).max(100).optional(),
});

const sellerSetupBase = z.object({
  token: z.string().min(1, "Invalid token"),
  password: passwordSchema,
});

export const sellerSetupSchema = withPasswordConfirmation(sellerSetupBase);

export const sellerLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

// ============================================================================
// MALL OWNER SCHEMAS
// ============================================================================

export const mallOwnerLoginSchema = z.object({
  email: emailSchema,
});

export const mallOwnerVerifySchema = z.object({
  token: z.string().min(1, "Invalid token"),
  password: z.string().min(1, "Password is required"),
});

// ============================================================================
// PASSWORD RESET SCHEMAS
// ============================================================================

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

const passwordResetBase = z.object({
  token: z.string().min(1, "Invalid token"),
  password: passwordSchema,
});

export const passwordResetSchema = withPasswordConfirmation(passwordResetBase);

// ============================================================================
// TOKEN VALIDATION SCHEMAS
// ============================================================================

export const tokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const emailTokenSchema = z.object({
  email: emailSchema,
  token: z.string().min(1, "Token is required"),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type UserSignupInput = z.infer<typeof userSignupSchema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;
export type SellerInviteInput = z.infer<typeof sellerInviteSchema>;
export type SellerSetupInput = z.infer<typeof sellerSetupSchema>;
export type SellerLoginInput = z.infer<typeof sellerLoginSchema>;
export type MallOwnerLoginInput = z.infer<typeof mallOwnerLoginSchema>;
export type MallOwnerVerifyInput = z.infer<typeof mallOwnerVerifySchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type PasswordResetRequestInput = z.infer<
  typeof passwordResetRequestSchema
>;
export type TokenInput = z.infer<typeof tokenSchema>;
