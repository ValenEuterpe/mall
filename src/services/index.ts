// src/lib/services/auth/index.ts
export {
  findAccountByEmail,
  findAccountByEmailSequential,
  findAccountByEmailForTypes,
  logEmailCheck,
  findFoundAccountByEmail,
  findFoundAccountById,
} from "./auth/account.service";

export {
  findAdminAccountByEmail,
  checkAccountStatus,
  updateFailedAttempts,
  handleFailedPasswordAttempt,
  updateLoginMetadata,
  logLoginAttempt,
  type AccountStatusResult,
  type AccountStatusError,
  type AccountStatusValid,
} from "./auth/admin-login.service";

export {
  findUserByEmail,
  checkUserLockStatus,
  checkEmailVerification,
  checkUserActiveStatus,
  handleUserFailedAttempt,
  updateUserLoginMetadata,
  logUserLoginAttempt,
  type UserStatusResult,
  type UserStatusError,
  type UserStatusValid,
} from "./auth/user-login.service";

export {
  clearAuthCookies,
  getAuthTokensFromCookies,
  terminateSession,
  terminateAllUserSessions,
  logLogoutEvent,
} from "./auth/logout.service";

export {
  findMallOwnerByEmail,
  updateMagicLinkRequestMetadata,
  logMagicLinkEvent,
  recordMallOwnerLoginAttempt,
  type MagicLinkEvent,
} from "./auth/mall-owner.service";

export {
  findMallOwnerForVerification,
  updateMallOwnerLoginMetadata,
  verifyMallOwnerToken,
  consumeMallOwnerToken,
  logVerifyLoginEvent,
  checkMallOwnerLockStatus,
  handleMallOwnerFailedAttempt,
  type TokenVerificationResult,
  type TokenVerificationSuccess,
  type TokenVerificationError,
  type VerifyLoginEvent,
} from "./auth/mall-owner.service";

export {
  updateAccountPassword,
  invalidateAccountSessions,
  sendPasswordChangeNotification,
  mapTokenErrorToResponse,
  logPasswordResetEvent,
  checkAccountActiveForReset,
  logPasswordResetRequestEvent,
  type PasswordResetRequestEvent,
  type PasswordResetEvent,
} from "./auth/password-reset.service";

export {
  findAndValidateInvitation,
  findSetupAccountByEmail,
  checkAccountAlreadySetup,
  checkSetupAccountActive,
  completeAccountSetup,
  updateSetupLoginMetadata,
  sendSetupWelcomeEmail,
  logSetupEvent,
  type SetupEvent,
} from "./auth/setup-account.service";

export {
  checkExistingUser,
  createUser,
  sendUserVerificationEmail,
  logSignupAttempt,
  type ExistingUserInfo,
} from "./auth/signup.service";

export {
  findUserForVerification,
  findUserForResend,
  markEmailAsVerified,
  mapTokenErrorToCode,
  sendWelcomeEmailAfterVerification,
  resendVerificationEmail,
  logVerificationAttempt,
  type ResendVerificationResult,
} from "./auth/verify-email.service";

export {
  requireProductOwnership,
  requireShopOwnership,
  requireGenericOwnership,
  checkResourceOwnership,
} from "../lib/auth/ownership";

export {
  hasPermission,
  canAccess,
  getRolePermissions,
  hasResourceAccess,
  checkOwnership,
  type Permission,
  type PermissionAction,
} from "../lib/auth/rbac";
