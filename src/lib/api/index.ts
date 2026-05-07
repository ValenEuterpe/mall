// src/lib/api/index.ts
// Barrel export for API utilities

// Response builders
export {
  successResponse,
  createdResponse,
  noContentResponse,
  acceptedResponse,
  paginatedResponse,
  buildPaginationMeta,
  redirectResponse,
  methodNotAllowed,
  healthResponse,
  type ApiSuccessResponse,
  type PaginationMeta,
  type ApiListResponse,
} from "./response";

// Auth helpers
export {
  requireAuth,
  optionalAuth,
  getRequestContext,
  AuthError,
} from "./auth-helper";

// Auth wrappers
export {
  withAuth,
  withUserAuth,
  withSellerAuth,
  withMallOwnerAuth,
  withAdminAuth,
  withSellerOrAdminAuth,
  withBusinessAuth,
} from "./with-auth";

// API route middleware
export {
  withMiddleware,
  withAuthMiddleware,
  withPublicMiddleware,
  withAdminMiddleware,
  withSellerMiddleware,
} from "./middleware";
