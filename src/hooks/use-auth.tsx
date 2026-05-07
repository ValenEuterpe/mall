"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { apiClient, ApiClientError } from "@/lib/api-client";
import { toast } from "@/lib/utils/toast";
import type { UserRole as BackendUserRole } from "@/types/auth";

// ============================================================================
// Types
// ============================================================================

export type UserRole = BackendUserRole;

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  /** Seller/MallOwner display name */
  name?: string;
  role: UserRole;
  avatarUrl?: string;
  isVerified: boolean;
  createdAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  acceptTerms?: boolean;
  locale?: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
  confirmPassword: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<AuthUser | null>;
  signup: (data: SignupData) => Promise<AuthUser | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (data: ResetPasswordData) => Promise<boolean>;
  verifyEmail: (token: string) => Promise<boolean>;
  /** Resend verification email (requires email param for this backend) */
  resendVerification: (email: string) => Promise<boolean>;
  /** Not implemented on backend yet (kept for forward-compat). */
  updateProfile: (_data: Partial<AuthUser>) => Promise<AuthUser | null>;
  /** Not implemented on backend yet (kept for forward-compat). */
  changePassword: (
    _currentPassword: string,
    _newPassword: string
  ) => Promise<boolean>;
  hasRole: (...roles: UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();

  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    isInitialized: false,
  });

  const initializeAuth = useCallback(async () => {
    try {
      const response = await apiClient.get<{ user: AuthUser }>(
        "/auth/me",
        undefined,
        {
          showErrorToast: false,
          skipAuthRetry: true,
        }
      );

      if (response.success) {
        setState({
          user: response.data.user,
          isLoading: false,
          isAuthenticated: true,
          isInitialized: true,
        });
        return;
      }

      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        isInitialized: true,
      });
    } catch {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        isInitialized: true,
      });
    }
  }, []);

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<AuthUser | null> => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        // Backend login returns: { success: true, data: { user, expiresAt } }
        const response = await apiClient.post<{
          user: AuthUser;
          expiresAt: string;
        }>("/auth/login", credentials, { showErrorToast: false });

        if (response.success) {
          const user = response.data.user;

          setState({
            user,
            isLoading: false,
            isAuthenticated: true,
            isInitialized: true,
          });

          toast.success("Welcome back!", {
            description: `Logged in as ${user.email}`,
          });

          return user;
        }

        setState((prev) => ({ ...prev, isLoading: false }));
        return null;
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));

        const apiError = error as ApiClientError;

        if (apiError.status === 401) {
          toast.error("Invalid credentials", {
            description: "Please check your email and password",
          });
        } else if (apiError.status === 403) {
          toast.error("Account issue", {
            description: apiError.message,
          });
        } else {
          toast.error("Login failed", {
            description: apiError.message,
          });
        }

        return null;
      }
    },
    []
  );

  const signup = useCallback(
    async (data: SignupData): Promise<AuthUser | null> => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        // Backend signup returns: { success: true, data: { userId, email, firstName, lastName, emailVerificationSent } }
        const response = await apiClient.post<{
          userId: string;
          email: string;
          firstName: string;
          lastName: string;
          emailVerificationSent: boolean;
        }>("/auth/signup", data, { showErrorToast: false });

        if (response.success) {
          setState((prev) => ({ ...prev, isLoading: false }));

          toast.success("Account created!", {
            description: "Please check your email to verify your account",
          });

          return {
            id: response.data.userId,
            email: response.data.email,
            firstName: response.data.firstName,
            lastName: response.data.lastName,
            role: "USER",
            isVerified: false,
          };
        }

        setState((prev) => ({ ...prev, isLoading: false }));
        return null;
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));

        const apiError = error as ApiClientError;

        if (apiError.status === 409) {
          toast.error("Email already exists", {
            description: "Please use a different email or try logging in",
          });
        } else {
          toast.error("Signup failed", {
            description: apiError.message,
          });
        }

        return null;
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiClient.post("/auth/logout", undefined, {
        showErrorToast: false,
      });
    } catch {
      // Continue with logout even if API fails.
    }

    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isInitialized: true,
    });

    toast.success("Logged out successfully");
    router.push("/");
  }, [router]);

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const response = await apiClient.get<{ user: AuthUser }>(
        "/auth/me",
        undefined,
        {
          showErrorToast: false,
          skipAuthRetry: true,
        }
      );

      if (response.success) {
        setState((prev) => ({
          ...prev,
          user: response.data.user,
          isAuthenticated: true,
          isInitialized: true,
        }));
        return response.data.user;
      }

      return null;
    } catch {
      return null;
    }
  }, []);

  const forgotPassword = useCallback(
    async (email: string): Promise<boolean> => {
      try {
        // Backend endpoint is /auth/reset-password/request
        const response = await apiClient.post(
          "/auth/reset-password/request",
          { email },
          { showErrorToast: false }
        );

        if (response.success) {
          toast.success("Password reset email sent", {
            description: "If an account exists, you will receive an email",
          });
          return true;
        }

        return false;
      } catch {
        // Do not reveal whether email exists.
        toast.success("Password reset email sent", {
          description: "If an account exists, you will receive an email",
        });
        return true;
      }
    },
    []
  );

  const resetPassword = useCallback(
    async (data: ResetPasswordData): Promise<boolean> => {
      try {
        // Backend endpoint is /auth/reset-password/confirm
        const response = await apiClient.post(
          "/auth/reset-password/confirm",
          data,
          { showErrorToast: false }
        );

        if (response.success) {
          toast.success("Password reset successful", {
            description: "You can now log in with your new password",
          });
          return true;
        }

        return false;
      } catch (error) {
        const apiError = error as ApiClientError;

        if (apiError.status === 400) {
          toast.error("Invalid or expired token", {
            description: "Please request a new password reset",
          });
        } else {
          toast.error("Password reset failed", {
            description: apiError.message,
          });
        }

        return false;
      }
    },
    []
  );

  const verifyEmail = useCallback(async (token: string): Promise<boolean> => {
    try {
      // Backend response does not return a user; it returns verification info.
      const response = await apiClient.post(
        "/auth/verify-email",
        { token },
        { showErrorToast: false }
      );

      if (response.success) {
        toast.success("Email verified!", {
          description: "You can now log in to your account",
        });

        // If verification also created a session (it doesn't currently), refresh would pick it up.
        // For now we keep the auth state unchanged.
        return true;
      }

      return false;
    } catch (error) {
      const apiError = error as ApiClientError;

      toast.error("Verification failed", {
        description:
          apiError.status === 400
            ? "Invalid or expired verification link"
            : apiError.message,
      });

      return false;
    }
  }, []);

  const resendVerification = useCallback(
    async (email: string): Promise<boolean> => {
      try {
        // Backend uses PUT /auth/verify-email with { email }
        const response = await apiClient.put(
          "/auth/verify-email",
          { email },
          { showErrorToast: false }
        );

        if (response.success) {
          toast.success("Verification email sent", {
            description: "Please check your inbox",
          });
          return true;
        }

        return false;
      } catch (error) {
        const apiError = error as ApiClientError;

        if (apiError.status === 409) {
          toast.info("Already verified", {
            description: "This email is already verified. You can log in.",
          });
          return true;
        }

        toast.error("Failed to resend verification email", {
          description: apiError.message,
        });

        return false;
      }
    },
    []
  );

  // These endpoints do not exist yet in this repo. We expose methods for forward compatibility.
  const updateProfile = useCallback(
    async (_data: Partial<AuthUser>): Promise<AuthUser | null> => {
      toast.error("Profile update is not implemented yet");
      return null;
    },
    []
  );

  const changePassword = useCallback(
    async (
      _currentPassword: string,
      _newPassword: string
    ): Promise<boolean> => {
      toast.error("Change password is not implemented yet");
      return false;
    },
    []
  );

  const hasRole = useCallback(
    (...roles: UserRole[]): boolean => {
      if (!state.user) return false;
      return roles.includes(state.user.role);
    },
    [state.user]
  );

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!state.user) return false;

      const rolePermissions: Record<UserRole, string[]> = {
        USER: ["read:products", "read:shops"],
        SELLER: [
          "read:products",
          "write:products",
          "read:shops",
          "write:own-shop",
          "read:analytics",
        ],
        MALL_OWNER: [
          "read:products",
          "write:products",
          "read:shops",
          "write:shops",
          "read:sellers",
          "write:sellers",
          "read:analytics",
          "write:settings",
        ],
      };

      return rolePermissions[state.user.role]?.includes(permission) ?? false;
    },
    [state.user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      signup,
      logout,
      refreshUser,
      forgotPassword,
      resetPassword,
      verifyEmail,
      resendVerification,
      updateProfile,
      changePassword,
      hasRole,
      hasPermission,
    }),
    [
      changePassword,
      forgotPassword,
      hasPermission,
      hasRole,
      login,
      logout,
      refreshUser,
      resendVerification,
      resetPassword,
      signup,
      state,
      updateProfile,
      verifyEmail,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hooks
// ============================================================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

export function useRequireAuth(redirectTo: string = "/login") {
  const { isAuthenticated, isInitialized, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && !isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isInitialized, isLoading, redirectTo, router]);

  return { isAuthenticated, isLoading: !isInitialized || isLoading };
}

export function useRequireRole(
  roles: UserRole | UserRole[],
  redirectTo: string = "/unauthorized"
) {
  const { user, isAuthenticated, isInitialized, isLoading, hasRole } =
    useAuth();
  const router = useRouter();

  const roleArray = Array.isArray(roles) ? roles : [roles];
  const hasRequiredRole = hasRole(...roleArray);

  useEffect(() => {
    if (isInitialized && !isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (!hasRequiredRole) {
        router.push(redirectTo);
      }
    }
  }, [
    hasRequiredRole,
    isAuthenticated,
    isInitialized,
    isLoading,
    redirectTo,
    router,
  ]);

  return {
    isAuthorized: isAuthenticated && hasRequiredRole,
    isLoading: !isInitialized || isLoading,
    user,
  };
}

export default useAuth;
