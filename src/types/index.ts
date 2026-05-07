// src/types/index.ts
// Barrel export for all shared types

// API types
export type { ApiResponse, ApiError } from "./api";

// Error types (composable error codes)
export type {
  BaseErrorCode,
  AuthErrorCode,
  RateLimitErrorCode,
  TokenErrorCode,
  SessionErrorCode,
  EmailErrorCode,
  ResourceErrorCode,
  UserLoginErrorCode,
  AdminLoginErrorCode,
  SignupErrorCode,
  VerifyEmailErrorCode,
  PasswordResetErrorCode,
  PasswordResetRequestErrorCode,
  SetupErrorCode,
  MagicLinkErrorCode,
  VerifyLoginErrorCode,
  LogoutErrorCode,
  RefreshErrorCode,
  EmailCheckErrorCode,
  ErrorResponseBody,
  SuccessResponseBody,
  ApiResponseBody,
} from "./errors";

export { isErrorResponse, isSuccessResponse } from "./errors";

// Auth types - Core
export type {
  UserRole,
  AuthUser,
  UserSession,
  SafeUser,
  SafeSeller,
  SafeMallOwner,
  AuthenticatedUser,
  AccessTokenPayload,
  RefreshTokenPayload,
} from "./auth";

// Auth types - Account Info
export type {
  AccountType,
  AccountInfo,
  UserAccountInfo,
  SellerAccountInfo,
  MallOwnerAccountInfo,
  AccountLookupResult,
} from "./auth";

// Auth types - Login
export type {
  LoginSuccessResponse,
  LoginNeedsSetupResponse,
  LoginErrorResponse,
  LoginResponse,
  UserLoginData,
  UserLoginSuccessResponse,
  UserLoginErrorResponse,
  UserLoginResponse,
  UserAccountRecord,
  AdminPortalRole,
  UnifiedAccount,
} from "./auth";

// Auth types - Signup & Verification
export type {
  SignupUserData,
  SignupSuccessResponse,
  SignupErrorResponse,
  SignupResponse,
  SignupData,
  CreatedUser,
  VerifyEmailSuccessData,
  VerifyEmailSuccessResponse,
  VerifyEmailErrorResponse,
  VerifyEmailResponse,
  VerifyEmailUserInfo,
} from "./auth";

// Auth types - Password Reset
export type {
  PasswordResetSuccessResponse,
  PasswordResetErrorResponse,
  PasswordResetResponse,
  PasswordResetRequestSuccessResponse,
  PasswordResetRequestErrorResponse,
  PasswordResetRequestResponse,
  FoundAccount,
} from "./auth";

// Auth types - Setup Account
export type {
  SetupSuccessResponse,
  SetupErrorResponse,
  SetupResponse,
  SetupAccountRole,
  SetupAccountData,
  SetupFoundAccount,
  InvitationData,
  InvitationValidation,
  InvitationValidationResult,
  InvitationValidationError,
} from "./auth";

// Auth types - Mall Owner
export type {
  MagicLinkSuccessResponse,
  MagicLinkErrorResponse,
  MagicLinkResponse,
  MallOwnerInfo,
  MallOwnerData,
  MallOwnerRecord,
  VerifyLoginSuccessResponse,
  VerifyLoginErrorResponse,
  VerifyLoginResponse,
} from "./auth";

// Auth types - Logout & Refresh
export type {
  LogoutSuccessData,
  LogoutSuccessResponse,
  LogoutErrorResponse,
  LogoutResponse,
  LogoutOptions,
  RefreshSuccessResponse,
  RefreshErrorResponse,
  RefreshResponse,
} from "./auth";

// Auth types - Session
export type {
  CreateSessionInput,
  SessionOwnerField,
  SessionOwner,
  SessionOwnerUser,
  SessionOwnerSeller,
  SessionOwnerMallOwner,
  SessionWithOwner,
  SessionWithRelations,
  FlatSessionOwner,
} from "./auth";

// Auth types - Tokens
export type {
  SupportedTokenType,
  VerificationLinkType,
  TokenCreationSuccess,
  TokenCreationError,
  TokenCreationResult,
  TokenVerificationSuccess,
  TokenVerificationError,
  TokenVerificationResult,
  TokenStats,
} from "./auth";

// Auth types - Middleware
export type {
  ProtectionLevel,
  RoleRestriction,
  AuthMiddlewareResult,
  RequestContext,
} from "./auth";

// Email types
export type * from "./email";

// Product types
export type {
  ProductCardShop,
  ProductCardCategory,
  ProductCardData,
  SellerProductCardData,
  StockStatus,
  StockStatusInfo,
} from "./product";

export { getStockStatus, formatPrice } from "./product";
