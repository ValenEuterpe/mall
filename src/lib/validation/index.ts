// src/lib/validation/index.ts
// Barrel export for validation utilities

// Request validation
export { validateBody, validateQuery, validateParams } from "./request";

// Schemas - Auth
export {
  userSignupSchema,
  userLoginSchema,
  sellerInviteSchema,
  sellerSetupSchema,
  sellerLoginSchema,
  mallOwnerLoginSchema,
  mallOwnerVerifySchema,
  emailSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  type UserSignupInput,
  type UserLoginInput,
  type SellerInviteInput,
  type SellerSetupInput,
  type SellerLoginInput,
  type MallOwnerLoginInput,
  type MallOwnerVerifyInput,
  type PasswordResetInput,
  type PasswordResetRequestInput,
  type TokenInput,
} from "./schemas/auth";

// Schemas - Common
export * from "./schemas/common";

// Schemas - Domain
export * from "./schemas/product";
export * from "./schemas/seller";
export * from "./schemas/shop";
