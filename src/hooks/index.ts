// Auth
export {
  useAuth,
  AuthProvider,
  useRequireAuth,
  useRequireRole,
} from "./use-auth";
export type {
  AuthUser,
  UserRole,
  LoginCredentials,
  SignupData,
  ResetPasswordData,
} from "./use-auth";

// Cart
export { CartProvider, useCart, useCartTotals, useIsInCart } from "./use-cart";
export type { CartItem, CartProduct, ShopLocation } from "@/lib/cart/types";

// Products
export {
  useProducts,
  useProduct,
  useProductFromList,
  useFilteredProducts,
} from "./use-products";
export type {
  ProductListItem,
  ProductDetail,
  ProductFilters,
  ProductSorting,
  SortField,
  SortOrder,
} from "./use-products";

// Categories
export {
  useCategories,
  useCategory,
  useCategoryTree,
  clearCategoriesCache,
  prefetchCategories,
} from "./use-categories";
export type { Category, Subcategory } from "./use-categories";

// Debounce
export {
  useDebounce,
  useDebouncedCallback,
  useDebouncedState,
} from "./use-debounce";
export type {
  DebounceOptions,
  DebouncedFunction,
  DebouncedStateReturn,
} from "./use-debounce";

// Local Storage
export {
  useLocalStorage,
  useLocalStorageToggle,
  useLocalStorageArray,
} from "./use-local-storage";
export type {
  UseLocalStorageOptions,
  StoredValue,
  UseLocalStorageReturn,
} from "./use-local-storage";

// Media Query
export {
  useMediaQuery,
  useBreakpoint,
  useBreakpointUp,
  useBreakpointDown,
  useBreakpointBetween,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsTouchDevice,
  usePrefersReducedMotion,
  usePrefersDarkMode,
  usePrefersLightMode,
  useOrientation,
  useIsHighDPI,
  useResponsiveValue,
} from "./use-media-query";
export type {
  UseMediaQueryOptions,
  Breakpoint,
  BreakpointConfig,
} from "./use-media-query";

// Pagination
export { usePagination } from "./use-pagination";
export type {
  UsePaginationOptions,
  PaginationState,
  UsePaginationReturn,
} from "./use-pagination";

// Existing hooks
export { useToast } from "./useToast";
export type { UseToastReturn } from "./useToast";

export { useErrorHandler } from "./useErrorHandler";
export type {
  ErrorState,
  UseErrorHandlerOptions,
  UseErrorHandlerReturn,
} from "./useErrorHandler";

// Seller Product Mutations
export { useSellerProductMutations } from "./use-seller-product-mutations";
export type {
  UseSellerProductMutationsOptions,
  SellerProductMutations,
} from "./use-seller-product-mutations";
