"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Shield,
  Store,
  AlertCircle,
} from "lucide-react";

import { useRouter } from "@/i18n/routing";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { toast } from "@/lib/utils/toast";
import { useAuth } from "@/hooks/use-auth";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type {
  AccountInfo,
  AccountType,
  AdminPortalRole,
  SellerUserData,
} from "@/types/auth";

type AdminRole = Extract<AdminPortalRole, "SELLER">;

type LoginStep = "email" | "password";

type LoadingState = "idle" | "checking" | "logging-in";

type EmailCheckResponseData = {
  exists: boolean;
  email: string;
  account?: AccountInfo;
};

type AdminLoginSuccessData = {
  user: SellerUserData;
  role: AdminPortalRole;
  expiresAt: string;
};

type AdminLoginState = {
  step: LoginStep;
  email: string;
  role: AdminRole | null;
  businessName: string | null;
  needsSetup: boolean;
  error: string | null;
  loadingState: LoadingState;
};

const INITIAL_STATE: AdminLoginState = {
  step: "email",
  email: "",
  role: null,
  businessName: null,
  needsSetup: false,
  error: null,
  loadingState: "idle",
};

const ROLE_CONFIG: Record<
  AdminRole,
  {
    labelKey: "seller" | "advertiser";
    icon: React.ComponentType<{ className?: string }>;
    badgeVariant: "default" | "secondary";
    dashboardPath: string;
    colorClassName: string;
  }
> = {
  SELLER: {
    labelKey: "seller",
    icon: Store,
    badgeVariant: "default",
    dashboardPath: "/seller/dashboard",
    colorClassName: "text-blue-600",
  },
};

function isAdminRole(value: unknown): value is AdminRole {
  return value === "SELLER";
}

function deriveRoleFromAccountType(
  type: AccountType | undefined
): AdminRole | null {
  if (type === "SELLER") return type;
  return null;
}

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, ...props }, ref) => {
    const t = useTranslations("auth.adminLogin");
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="relative">
        <Lock
          className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          ref={ref}
          type={showPassword ? "text" : "password"}
          className={cn(
            "pr-10 pl-10",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? t("hidePassword") : t("showPassword")}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="text-muted-foreground h-4 w-4" />
          ) : (
            <Eye className="text-muted-foreground h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

function StepIndicator({
  currentStep,
}: {
  currentStep: LoginStep;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-center gap-2" aria-hidden="true">
      <div
        className={cn(
          "h-2 w-2 rounded-full transition-colors",
          currentStep === "email" ? "bg-primary" : "bg-primary/30"
        )}
      />
      <div
        className={cn(
          "h-2 w-2 rounded-full transition-colors",
          currentStep === "password" ? "bg-primary" : "bg-primary/30"
        )}
      />
    </div>
  );
}

function RoleIndicator({
  email,
  role,
  businessName,
  onChangeEmail,
}: {
  email: string;
  role: AdminRole;
  businessName: string | null;
  onChangeEmail: () => void;
}): React.ReactElement {
  const t = useTranslations("auth.adminLogin");

  const config = ROLE_CONFIG[role];
  const Icon = config.icon;

  return (
    <div className="bg-muted/50 flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "bg-background flex h-10 w-10 items-center justify-center rounded-full",
            "border shadow-sm"
          )}
        >
          <Icon className={cn("h-5 w-5", config.colorClassName)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{email}</p>
          {businessName && (
            <p className="text-muted-foreground truncate text-xs">
              {businessName}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={config.badgeVariant}>{t(config.labelKey)}</Badge>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onChangeEmail}
          aria-label={t("useDifferentEmail")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminLoginPage(): React.ReactElement {
  const t = useTranslations("auth.adminLogin");
  const tErrors = useTranslations("auth.errors");

  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();

  const [state, setState] = useState<AdminLoginState>(INITIAL_STATE);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const emailSchema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .min(1, tErrors("required"))
          .email(tErrors("invalidEmail")),
      }),
    [tErrors]
  );

  const passwordSchema = useMemo(
    () =>
      z.object({
        password: z
          .string()
          .min(1, tErrors("required"))
          .min(8, tErrors("weakPassword")),
      }),
    [tErrors]
  );

  type EmailFormData = z.infer<typeof emailSchema>;
  type PasswordFormData = z.infer<typeof passwordSchema>;

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
    mode: "onBlur",
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
    mode: "onBlur",
  });

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (state.step === "password") {
      passwordInputRef.current?.focus();
    }
  }, [state.step]);

  const updateState = useCallback((updates: Partial<AdminLoginState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleResetToEmail = useCallback(() => {
    passwordForm.reset();
    updateState({
      step: "email",
      role: null,
      businessName: null,
      needsSetup: false,
      error: null,
      loadingState: "idle",
    });
  }, [passwordForm, updateState]);

  const handleEmailSubmit = useCallback(
    async (data: EmailFormData) => {
      updateState({ loadingState: "checking", error: null });

      try {
        const response = await apiClient.post<EmailCheckResponseData>(
          "/auth/check-email",
          { email: data.email },
          { showErrorToast: false }
        );

        if (!response.success) {
          updateState({ loadingState: "idle", error: t("emailCheckFailed") });
          return;
        }

        if (!response.data.exists) {
          updateState({ loadingState: "idle", error: t("emailNotRegistered") });
          return;
        }

        // Some deployments may hide account details; without them we cannot route safely.
        if (!response.data.account?.type) {
          updateState({
            loadingState: "idle",
            error: t("cannotDetermineRole"),
          });
          return;
        }

        const role = deriveRoleFromAccountType(response.data.account.type);

        if (!role) {
          updateState({ loadingState: "idle", error: t("wrongPortal") });
          return;
        }

        const accountExtras = response.data.account as unknown as Record<string, unknown> | undefined;
        const pickString = (key: string): string | null => {
          const v = accountExtras?.[key];
          return typeof v === "string" ? v : null;
        };
        const businessName =
          pickString("businessName") ??
          pickString("companyName") ??
          pickString("displayName");

        updateState({
          step: "password",
          email: data.email,
          role,
          businessName,
          needsSetup: false,
          error: null,
          loadingState: "idle",
        });
      } catch (error) {
        const message =
          error instanceof ApiClientError
            ? error.message
            : t("emailCheckFailed");
        updateState({ loadingState: "idle", error: message });
      }
    },
    [t, updateState]
  );

  const handlePasswordSubmit = useCallback(
    async (data: PasswordFormData) => {
      if (!state.email || !state.role) {
        handleResetToEmail();
        return;
      }

      updateState({ loadingState: "logging-in", error: null });

      try {
        const response = await apiClient.post<AdminLoginSuccessData>(
          "/auth/admin-login",
          { email: state.email, password: data.password },
          { showErrorToast: false }
        );

        if (!response.success) {
          updateState({
            loadingState: "idle",
            error: response.error.message ?? t("invalidCredentials"),
          });
          passwordInputRef.current?.focus();
          passwordInputRef.current?.select();
          return;
        }

        const role = response.data.role;

        if (!isAdminRole(role)) {
          updateState({ loadingState: "idle", error: t("wrongPortal") });
          return;
        }

        const roleConfig = ROLE_CONFIG[role];

        toast.success(t("loginSuccess"), {
          description: t("loginSuccessDescription", {
            role: t(roleConfig.labelKey),
          }),
        });

        // Refresh auth state so the portal layout sees the session
        await refreshUser();

        setTimeout(() => {
          router.push(roleConfig.dashboardPath);
        }, 400);
      } catch (error) {
        const apiError = error as ApiClientError;

        // Our apiClient throws on non-2xx; admin-login uses a 403 needs-setup response.
        if (apiError.status === 403 && apiError.code === "ACCOUNT_NOT_SETUP") {
          toast.info(t("needsSetupTitle"), {
            description: t("needsSetupDescription"),
          });

          // We don't get role back (non-2xx is turned into an exception); use the role
          // detected during email step.
          setTimeout(() => {
            router.push(
              `/setup-account?email=${encodeURIComponent(state.email)}&role=${state.role}`
            );
          }, 500);

          return;
        }

        updateState({
          loadingState: "idle",
          error: apiError.message || t("invalidCredentials"),
        });
        passwordInputRef.current?.focus();
        passwordInputRef.current?.select();
      }
    },
    [handleResetToEmail, router, state.email, state.role, t, updateState]
  );

  if (authLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isAuthenticated) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-muted-foreground mt-4 text-sm">
            {t("alreadyLoggedIn")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const isLoading = state.loadingState !== "idle";

  const passwordField = passwordForm.register("password");

  return (
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-center">
          <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
            <Shield className="text-primary h-6 w-6" />
          </div>
        </div>

        <div className="space-y-1 text-center">
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>
            {state.step === "email"
              ? t("subtitleEmail")
              : t("subtitlePassword", {
                  role: state.role ? t(ROLE_CONFIG[state.role].labelKey) : "",
                })}
          </CardDescription>
        </div>

        <StepIndicator currentStep={state.step} />
      </CardHeader>

      {state.error && (
        <div className="px-6">
          <Alert variant="destructive" className="animate-in fade-in-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        </div>
      )}

      {state.step === "email" && (
        <form
          onSubmit={emailForm.handleSubmit(
            (values) => void handleEmailSubmit(values)
          )}
        >
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">{t("emailLabel")}</Label>
              <div className="relative">
                <Mail
                  className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                  aria-hidden="true"
                />
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  placeholder={t("emailPlaceholder")}
                  disabled={isLoading}
                  className={cn(
                    "pl-10",
                    emailForm.formState.errors.email && "border-destructive"
                  )}
                  {...emailForm.register("email")}
                />
              </div>
              {emailForm.formState.errors.email && (
                <p className="text-destructive flex items-center gap-1 text-sm">
                  <AlertCircle className="h-3 w-3" />
                  {emailForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <p className="text-muted-foreground text-xs">{t("emailHint")}</p>
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {state.loadingState === "checking" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("verifying")}
                </>
              ) : (
                <>
                  {t("continue")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      )}

      {state.step === "password" && state.role && (
        <form
          onSubmit={passwordForm.handleSubmit(
            (values) => void handlePasswordSubmit(values)
          )}
        >
          <CardContent className="space-y-4">
            <RoleIndicator
              email={state.email}
              role={state.role}
              businessName={state.businessName}
              onChangeEmail={handleResetToEmail}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="admin-password">{t("passwordLabel")}</Label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => {
                    router.push(
                      `/reset-password?email=${encodeURIComponent(state.email)}`
                    );
                  }}
                >
                  {t("forgotPassword")}
                </Button>
              </div>

              {/* Avoid double-ref: RHF provides a ref and we also track focus with passwordInputRef */}
              <PasswordInput
                id="admin-password"
                autoComplete="current-password"
                placeholder={t("passwordPlaceholder")}
                disabled={isLoading}
                error={!!passwordForm.formState.errors.password}
                name={passwordField.name}
                onBlur={passwordField.onBlur}
                onChange={passwordField.onChange}
                ref={(el) => {
                  passwordField.ref(el);
                  passwordInputRef.current = el;
                }}
              />

              {passwordForm.formState.errors.password && (
                <p className="text-destructive flex items-center gap-1 text-sm">
                  <AlertCircle className="h-3 w-3" />
                  {passwordForm.formState.errors.password.message}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {state.loadingState === "logging-in" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("loggingIn")}
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t("loginToDashboard")}
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={handleResetToEmail}
              disabled={isLoading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("useDifferentEmail")}
            </Button>
          </CardFooter>
        </form>
      )}

      <div className="border-t px-6 py-4">
        <p className="text-muted-foreground text-center text-xs">
          {t("footerNote")}{" "}
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => router.push("/login")}
          >
            {t("regularUserLink")}
          </Button>
        </p>
      </div>
    </Card>
  );
}
