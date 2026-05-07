// src/types/auth.ts
import type { User, Seller, MallOwner } from "@/prisma/generated/client";

// ============================================================================
// CORE AUTH TYPES
// ============================================================================

export type UserRole = "USER" | "SELLER" | "MALL_OWNER";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
}

export interface UserSession extends AuthUser {
  sessionToken: string;
  expires: Date;
}

export type SafeUser = Omit<User, "password">;
export type SafeSeller = Omit<Seller, "password" | "inviteToken">;
export type SafeMallOwner = Omit<MallOwner, "password" | "mfaSecret">;

// ============================================================================
// CHECK EMAIL TYPES
// ============================================================================

export type AccountType = UserRole; // Alias for clarity in check-email context

export interface UserAccountInfo {
  type: "USER";
  needsVerification: boolean;
  isActive: boolean;
}

export interface SellerAccountInfo {
  type: "SELLER";
  needsSetup: boolean;
  isActive: boolean;
  status: string;
}

export interface MallOwnerAccountInfo {
  type: "MALL_OWNER";
  isActive: boolean;
}

export type AccountInfo =
  | UserAccountInfo
  | SellerAccountInfo
  | MallOwnerAccountInfo;

export interface AccountLookupResult {
  found: boolean;
  type: AccountType | null;
  info: AccountInfo | null;
}

// Check Email Response Types
export type EmailCheckErrorCode =
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export interface EmailExistsResponse {
  success: true;
  data: {
    exists: true;
    email: string;
    account: AccountInfo;
  };
}

export interface EmailNotExistsResponse {
  success: true;
  data: {
    exists: false;
    email: string;
  };
}

export interface EmailCheckMinimalResponse {
  success: true;
  data: {
    exists: boolean;
    email: string;
  };
}

export interface EmailCheckErrorResponse {
  success: false;
  error: {
    code: EmailCheckErrorCode;
    message: string;
    details?: unknown;
  };
}

export type EmailCheckResponse =
  | EmailExistsResponse
  | EmailNotExistsResponse
  | EmailCheckMinimalResponse
  | EmailCheckErrorResponse;

// ============================================================================
// PASSWORD RESET TYPES
// ============================================================================

export interface FoundAccount {
  id: string;
  email: string;
  password?: string | null;
  isActive: boolean;
  type: UserRole;
  displayName: string;
}

export interface UnifiedAccount {
  id: string;
  email: string;
  password: string | null;
  isActive: boolean;
  status: string;
  displayName: string;
  failedLoginAttempts: number | null;
  lockedUntil: Date | null;
  role: AdminPortalRole;
}

export interface PasswordResetSuccessResponse {
  success: true;
  message: string;
  data: {
    email: string;
    role: UserRole;
    sessionsInvalidated: boolean;
    redirectUrl: string;
  };
}

export type PasswordResetErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "ACCOUNT_NOT_FOUND"
  | "ACCOUNT_DISABLED"
  | "PASSWORD_SAME_AS_OLD"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR"
  | "METHOD_NOT_ALLOWED";

export interface PasswordResetErrorResponse {
  success: false;
  error: {
    code: PasswordResetErrorCode;
    message: string;
    details?: unknown;
    field?: string;
  };
}

export type PasswordResetResponse =
  | PasswordResetSuccessResponse
  | PasswordResetErrorResponse;

export interface TokenValidationSuccessResponse {
  success: true;
  data: {
    email: string;
    expiresAt: string;
  };
}

export type TokenValidationResponse =
  | TokenValidationSuccessResponse
  | PasswordResetErrorResponse;

// ============================================================================
// ADMIN LOGIN TYPES
// ============================================================================

export type AdminPortalRole = Extract<UserRole, "SELLER" | "MALL_OWNER">;

export type LoginErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_NOT_SETUP"
  | "ACCOUNT_DISABLED"
  | "ACCOUNT_LOCKED"
  | "ACCOUNT_PENDING"
  | "SESSION_ERROR"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export interface SellerUserData {
  id: string;
  email: string;
  name: string;
  businessName?: string;
  companyName?: string;
}

export interface LoginSuccessResponse {
  success: true;
  message: string;
  data: {
    user: SellerUserData;
    role: UserRole;
    expiresAt: string;
  };
}

export interface LoginNeedsSetupResponse {
  success: false;
  needsSetup: true;
  error: {
    code: "ACCOUNT_NOT_SETUP";
    message: string;
  };
  data: {
    email: string;
    role: UserRole;
  };
}

export interface LoginErrorResponse {
  success: false;
  needsSetup?: false;
  error: {
    code: LoginErrorCode;
    message: string;
    details?: unknown;
    retryAfter?: number;
  };
}

export type LoginResponse =
  | LoginSuccessResponse
  | LoginNeedsSetupResponse
  | LoginErrorResponse;

// ============================================================================
// MALL OWNER VERIFY TYPES
// ============================================================================

export interface MallOwnerData {
  id: string;
  email: string;
  name: string;
}

export interface VerifyLoginSuccessResponse {
  success: true;
  message: string;
  data: {
    user: MallOwnerData;
    expiresAt: string;
    redirectUrl: string;
  };
}

export type VerifyLoginErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "ACCOUNT_NOT_FOUND"
  | "INVALID_PASSWORD"
  | "ACCOUNT_DISABLED"
  | "ACCOUNT_LOCKED"
  | "IP_NOT_ALLOWED"
  | "MAX_ATTEMPTS_EXCEEDED"
  | "SESSION_ERROR"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export interface VerifyLoginErrorResponse {
  success: false;
  error: {
    code: VerifyLoginErrorCode;
    message: string;
    details?: unknown;
    remainingAttempts?: number;
    retryAfter?: number;
  };
}

export type VerifyLoginResponse =
  | VerifyLoginSuccessResponse
  | VerifyLoginErrorResponse;

export interface MallOwnerRecord {
  id: string;
  email: string;
  password: string;
  name: string;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

// ============================================================================
// ACCOUNT SETUP TYPES
// ============================================================================

export type SellerPortalRole = Extract<UserRole, "SELLER">;
export type AccountRole = SellerPortalRole; // Alias for backward compatibility

export interface AccountData {
  id: string;
  email: string;
  displayName: string;
  role: SellerPortalRole;
}

export interface SetupSuccessResponse {
  success: true;
  message: string;
  data: {
    user: AccountData;
    isLoggedIn: boolean;
    redirectUrl: string;
  };
}

export type SetupErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "WRONG_TOKEN_TYPE"
  | "ACCOUNT_NOT_FOUND"
  | "ACCOUNT_ALREADY_SETUP"
  | "ACCOUNT_DISABLED"
  | "SESSION_ERROR"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export interface SetupErrorResponse {
  success: false;
  error: {
    code: SetupErrorCode;
    message: string;
    details?: unknown;
    field?: string;
  };
}

export interface InvitationData {
  token: string;
  email: string;
  expires: Date;
  type: string;
}

export type SetupResponse = SetupSuccessResponse | SetupErrorResponse;

// Add these types to your existing types/auth.ts file:

// ============================================================================
// USER LOGIN TYPES (Regular Users)
// ============================================================================

export type UserLoginErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "EMAIL_NOT_VERIFIED"
  | "ACCOUNT_DISABLED"
  | "ACCOUNT_LOCKED"
  | "RATE_LIMITED"
  | "SESSION_ERROR"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export interface UserLoginData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface UserLoginSuccessResponse {
  success: true;
  message: string;
  data: {
    user: UserLoginData;
    expiresAt: string;
  };
}

export interface UserLoginErrorResponse {
  success: false;
  error: {
    code: UserLoginErrorCode;
    message: string;
    details?: unknown;
    retryAfter?: number;
  };
}

export type UserLoginResponse =
  | UserLoginSuccessResponse
  | UserLoginErrorResponse;

export interface UserAccountRecord {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  isActive: boolean;
  failedLoginAttempts: number | null;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
}

// Add these types to your existing types/auth.ts file:

// ============================================================================
// LOGOUT TYPES
// ============================================================================

export type LogoutErrorCode =
  | "NOT_AUTHENTICATED"
  | "INVALID_TOKEN"
  | "SESSION_NOT_FOUND"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export interface LogoutSuccessData {
  sessionTerminated: boolean;
  allSessionsTerminated: boolean;
  cookiesCleared: boolean;
}

export interface LogoutSuccessResponse {
  success: true;
  message: string;
  data: LogoutSuccessData;
}

export interface LogoutErrorResponse {
  success: false;
  error: {
    code: LogoutErrorCode;
    message: string;
    details?: unknown;
  };
}

export type LogoutResponse = LogoutSuccessResponse | LogoutErrorResponse;

export interface LogoutOptions {
  //Whether to terminate all sessions for the user (default: false)
  allDevices?: boolean;
}

// Add these types to your existing types/auth.ts file:

// ============================================================================
// MAGIC LINK TYPES (Mall Owner)
// ============================================================================

export type MagicLinkErrorCode =
  | "VALIDATION_ERROR"
  | "IP_NOT_ALLOWED"
  | "ACCOUNT_DISABLED"
  | "RATE_LIMITED"
  | "EMAIL_SEND_FAILED"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export interface MagicLinkSuccessResponse {
  success: true;
  message: string;
  data: {
    emailSent: boolean;
    expiresIn: string;
  };
}

export interface MagicLinkErrorResponse {
  success: false;
  error: {
    code: MagicLinkErrorCode;
    message: string;
    details?: unknown;
    retryAfter?: number;
  };
}

export type MagicLinkResponse =
  | MagicLinkSuccessResponse
  | MagicLinkErrorResponse;

export interface MallOwnerInfo {
  id: string;
  email: string;
  name: string;
  lastLoginAt: Date | null;
}

// ============================================================================
// PASSWORD RESET REQUEST TYPES
// ============================================================================

export type PasswordResetRequestErrorCode =
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "EMAIL_SEND_FAILED"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export interface PasswordResetRequestSuccessResponse {
  success: true;
  message: string;
  data: {
    emailSent: boolean;
    expiresIn: string;
  };
}

export interface PasswordResetRequestErrorResponse {
  success: false;
  error: {
    code: PasswordResetRequestErrorCode;
    message: string;
    details?: unknown;
    retryAfter?: number;
  };
}

export type PasswordResetRequestResponse =
  | PasswordResetRequestSuccessResponse
  | PasswordResetRequestErrorResponse;

// ============================================================================
// SETUP ACCOUNT TYPES (Seller only)
// ============================================================================

export type SetupAccountRole = Extract<UserRole, "SELLER">;

export interface SetupAccountData {
  id: string;
  email: string;
  displayName: string;
  role: SetupAccountRole;
}

export interface SetupFoundAccount {
  id: string;
  email: string;
  password: string | null;
  isActive: boolean;
  displayName: string;
  role: SetupAccountRole;
}

export interface InvitationData {
  token: string;
  email: string;
  expires: Date;
  type: string;
}

export interface InvitationValidationResult {
  valid: true;
  invitation: InvitationData;
}

export interface InvitationValidationError {
  valid: false;
  code: SetupErrorCode;
  message: string;
  status: number;
}

export type InvitationValidation =
  | InvitationValidationResult
  | InvitationValidationError;

export interface SetupTokenValidationResponse {
  success: true;
  data: {
    email: string;
    displayName: string;
    role: SetupAccountRole;
    expiresAt: string;
  };
}
// ============================================================================
// SIGNUP TYPES
// ============================================================================

export type SignupErrorCode =
  | "VALIDATION_ERROR"
  | "EMAIL_EXISTS"
  | "RATE_LIMITED"
  | "EMAIL_SEND_FAILED"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export interface SignupUserData {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerificationSent: boolean;
}

export interface SignupSuccessResponse {
  success: true;
  message: string;
  data: SignupUserData;
}

export interface SignupErrorResponse {
  success: false;
  error: {
    code: SignupErrorCode;
    message: string;
    details?: unknown;
  };
}

export type SignupResponse = SignupSuccessResponse | SignupErrorResponse;

export interface SignupData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface CreatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
}

// ============================================================================
// VERIFY EMAIL TYPES
// ============================================================================

export type VerifyEmailErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "TOKEN_ALREADY_USED"
  | "USER_NOT_FOUND"
  | "ALREADY_VERIFIED"
  | "RATE_LIMITED"
  | "EMAIL_SEND_FAILED"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export interface VerifyEmailSuccessData {
  email: string;
  verifiedAt: string;
  isNewVerification: boolean;
}

export interface VerifyEmailSuccessResponse {
  success: true;
  message: string;
  data: VerifyEmailSuccessData;
}

export interface VerifyEmailErrorResponse {
  success: false;
  error: {
    code: VerifyEmailErrorCode;
    message: string;
    details?: unknown;
    retryAfter?: number;
  };
}

export type VerifyEmailResponse =
  | VerifyEmailSuccessResponse
  | VerifyEmailErrorResponse;

export interface ResendEmailSuccessData {
  email: string;
  expiresAt: string;
}

export interface ResendEmailSuccessResponse {
  success: true;
  message: string;
  data: ResendEmailSuccessData;
}

export type ResendEmailResponse =
  | ResendEmailSuccessResponse
  | VerifyEmailErrorResponse;

export interface VerifyEmailUserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: Date | null;
  isActive: boolean;
}

// ============================================================================
// TOKEN REFRESH TYPES
// ============================================================================

export type RefreshErrorCode =
  | "NO_REFRESH_TOKEN"
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "TOKEN_REUSE_DETECTED"
  | "SESSION_NOT_FOUND"
  | "SESSION_EXPIRED"
  | "SESSION_REVOKED"
  | "ACCOUNT_DISABLED"
  | "INVALID_SESSION"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export interface RefreshSuccessResponse {
  success: true;
  message: string;
  data: {
    expiresAt: string;
    tokenRotated: boolean;
  };
}

export interface RefreshErrorResponse {
  success: false;
  error: {
    code: RefreshErrorCode;
    message: string;
    requiresLogin?: boolean;
  };
}

export type RefreshResponse = RefreshSuccessResponse | RefreshErrorResponse;

export interface RefreshTokenStatusResponse {
  success: true;
  data: {
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    shouldRefresh: boolean;
  };
}

export interface FlatSessionOwner {
  id: string;
  email: string;
  isActive: boolean;
  role: UserRole;
  displayName: string;
}

export interface SessionWithRelations {
  id: string;
  sessionToken: string;
  expires: Date;
  isRevoked?: boolean;
  updatedAt: Date;
  tokenFamily?: string;
  user: {
    id: string;
    email: string;
    isActive: boolean;
    firstName: string;
    lastName: string;
  } | null;
  seller: {
    id: string;
    email: string;
    isActive: boolean;
    businessName: string;
  } | null;
  advertiser: {
    id: string;
    email: string;
    isActive: boolean;
    companyName: string;
  } | null;
  mallOwner: {
    id: string;
    email: string;
    isActive: boolean;
    firstName: string;
    lastName: string;
    name: string;
  } | null;
}

// ============================================================================
// JWT TOKEN PAYLOAD TYPES
// ============================================================================

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  tokenFamily?: string;
  iat?: number;
  exp?: number;
}

// ============================================================================
// AUTHENTICATED USER CONTEXT
// ============================================================================

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
}

// ============================================================================
// AUTH HELPER TYPES
// ============================================================================

export type AuthErrorCode =
  | "NO_TOKEN"
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "INSUFFICIENT_PERMISSIONS"
  | "ACCOUNT_DISABLED"
  | "SESSION_EXPIRED"
  | "UNAUTHORIZED"
  | "FORBIDDEN";

// ============================================================================
// MIDDLEWARE TYPES
// ============================================================================

export type ProtectionLevel = "public" | "authenticated" | "role-based";

export interface RoleRestriction {
  // Path pattern to match
  pathPattern: string;
  // Allowed roles for this path
  allowedRoles: UserRole[];
  //Redirect path if access denied
  redirectPath?: string;
}

export interface AuthMiddlewareResult {
  authenticated: boolean;
  user: AuthenticatedUser | null;
  shouldRedirect: boolean;
  redirectUrl?: string;
  /** New tokens to set on response (if silent refresh occurred) */
  newTokens?: {
    accessToken: string;
    refreshToken?: string;
  };
}

export interface RequestContext {
  ip: string;
  userAgent: string;
  method: string;
  path: string;
  timestamp: string;
}

// ============================================================================
// VERIFICATION TOKEN TYPES
// ============================================================================

export type SupportedTokenType =
  | "EMAIL_VERIFICATION"
  | "PASSWORD_RESET"
  | "MAGIC_LINK";
export type VerificationLinkType = "email" | "reset" | "magic";

export interface TokenCreationSuccess {
  success: true;
  token: string;
  expiresAt: Date;
}

export interface TokenCreationError {
  success: false;
  error: "RATE_LIMITED" | "DATABASE_ERROR" | "UNSUPPORTED_TYPE";
  message: string;
  retryAfter?: number;
}

export type TokenCreationResult = TokenCreationSuccess | TokenCreationError;

export interface TokenVerificationSuccess {
  valid: true;
  email: string;
  token: string;
}

export interface TokenVerificationError {
  valid: false;
  error:
    | "INVALID_TOKEN"
    | "WRONG_TYPE"
    | "EXPIRED"
    | "ALREADY_USED"
    | "DATABASE_ERROR";
  message: string;
}

export type TokenVerificationResult =
  | TokenVerificationSuccess
  | TokenVerificationError;

// ============================================================================
// SESSION TYPES
// ============================================================================

export interface CreateSessionInput {
  userId: string;
  email: string;
  role: UserRole;
  ipAddress?: string;
  userAgent?: string;
}

export type SessionOwnerField =
  | "userId"
  | "sellerId"
  | "advertiserId"
  | "mallOwnerId";

export interface SessionOwnerUser {
  type: "USER";
  data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  };
}

export interface SessionOwnerSeller {
  type: "SELLER";
  data: {
    id: string;
    email: string;
    businessName: string | null;
    isActive: boolean;
  };
}

export interface SessionOwnerMallOwner {
  type: "MALL_OWNER";
  data: {
    id: string;
    email: string;
    name: string;
  };
}

export type SessionOwner =
  | SessionOwnerUser
  | SessionOwnerSeller
  | SessionOwnerMallOwner
  | null;

export interface SessionWithOwner {
  session: {
    id: string;
    sessionToken: string;
    expires: Date;
    ipAddress: string | null;
    userAgent: string | null;
  };
  owner: SessionOwner;
}

export interface TokenStats {
  byType: Record<string, number>;
  expired: number;
  total: number;
}
