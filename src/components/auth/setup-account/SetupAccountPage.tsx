"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";

import { useRouter } from "@/i18n/routing";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { toast } from "@/lib/utils/toast";

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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { AccountData, SetupAccountRole } from "@/types/auth";

type AdminRole = Extract<SetupAccountRole, "SELLER">;

type PageState = "validating" | "ready" | "submitting" | "success" | "error";

type SetupTokenValidationData = {
  email: string;
  displayName: string;
  role: SetupAccountRole;
  expiresAt: string;
};

type SetupSuccessData = {
  user: AccountData;
  isLoggedIn: boolean;
  redirectUrl: string;
};

type AccountInfo = {
  email: string;
  role: AdminRole;
  displayName: string | null;
};

const REDIRECT_DELAY_MS = 2000;

const ROLE_CONFIG: Record<
  AdminRole,
  {
    labelKey: "seller";
    icon: React.ComponentType<{ className?: string }>;
    colorClassName: string;
    dashboardFallbackPath: string;
  }
> = {
  SELLER: {
    labelKey: "seller",
    icon: Store,
    colorClassName: "text-blue-600",
    dashboardFallbackPath: "/seller/dashboard",
  },
};

function isAdminRole(role: unknown): role is AdminRole {
  return role === "SELLER";
}

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, ...props }, ref) => {
    const t = useTranslations("auth.setupAccount");
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

function SetupFormSkeleton(): React.ReactElement {
  return (
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <div className="flex justify-center">
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
        <div className="space-y-2 text-center">
          <Skeleton className="mx-auto h-8 w-48" />
          <Skeleton className="mx-auto h-4 w-64" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-16 w-full rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-11 w-full" />
      </CardFooter>
    </Card>
  );
}

function SuccessView({ roleLabel }: { roleLabel: string }): React.ReactElement {
  const t = useTranslations("auth.setupAccount");

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>

        <h2 className="mb-2 text-2xl font-bold">{t("successTitle")}</h2>
        <p className="text-muted-foreground mb-6">{t("successSubtitle")}</p>

        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t("redirecting", { role: roleLabel })}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorView({
  message,
  onBack,
  onRetry,
}: {
  message: string;
  onBack: () => void;
  onRetry?: () => void;
}): React.ReactElement {
  const t = useTranslations("auth.setupAccount");

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="bg-destructive/10 mb-6 flex h-20 w-20 items-center justify-center rounded-full">
          <AlertCircle className="text-destructive h-10 w-10" />
        </div>

        <h2 className="mb-2 text-2xl font-bold">{t("errorTitle")}</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">{message}</p>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack}>
            {t("backToLogin")}
          </Button>
          {onRetry && <Button onClick={onRetry}>{t("tryAgain")}</Button>}
        </div>
      </CardContent>
    </Card>
  );
}

function AccountInfoBanner({
  account,
}: {
  account: AccountInfo;
}): React.ReactElement {
  const t = useTranslations("auth.setupAccount");
  const config = ROLE_CONFIG[account.role];
  const Icon = config.icon;

  return (
    <div className="bg-muted/50 flex items-center gap-4 rounded-lg border p-4">
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full",
          "bg-background border shadow-sm"
        )}
      >
        <Icon className={cn("h-6 w-6", config.colorClassName)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{account.email}</p>
        {account.displayName && (
          <p className="text-muted-foreground truncate text-sm">
            {account.displayName}
          </p>
        )}
      </div>
      <Badge variant="secondary">{t(config.labelKey)}</Badge>
    </div>
  );
}

function PasswordStrength({
  password,
}: {
  password: string;
}): React.ReactElement | null {
  const t = useTranslations("auth.setupAccount");

  const requirements = useMemo(
    () => [
      { key: "length", label: t("reqLength"), regex: /.{8,}/ },
      { key: "uppercase", label: t("reqUppercase"), regex: /[A-Z]/ },
      { key: "lowercase", label: t("reqLowercase"), regex: /[a-z]/ },
      { key: "number", label: t("reqNumber"), regex: /[0-9]/ },
      {
        key: "special",
        label: t("reqSpecial"),
        regex: /[!@#$%^&*(),.?\":{}|<>]/,
      },
    ],
    [t]
  );

  const checks = useMemo(
    () => requirements.map((r) => ({ ...r, met: r.regex.test(password) })),
    [requirements, password]
  );

  const strength = useMemo(() => {
    const requiredChecks = checks.slice(0, 4);
    const metCount = requiredChecks.filter((c) => c.met).length;
    return (metCount / requiredChecks.length) * 100;
  }, [checks]);

  const strengthLabel = useMemo(() => {
    if (strength === 0) return t("strengthEnter");
    if (strength <= 25) return t("strengthWeak");
    if (strength <= 50) return t("strengthFair");
    if (strength <= 75) return t("strengthGood");
    return t("strengthStrong");
  }, [strength, t]);

  if (!password) return null;

  return (
    <div className="space-y-3 pt-2">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("passwordStrength")}</span>
          <span
            className={cn(
              "font-medium",
              strength <= 25 && "text-destructive",
              strength > 25 && strength <= 50 && "text-orange-600",
              strength > 50 && strength <= 75 && "text-yellow-600",
              strength > 75 && "text-green-600"
            )}
          >
            {strengthLabel}
          </span>
        </div>
        <Progress value={strength} className="h-1.5" />
      </div>

      <ul className="grid gap-1.5 text-xs" role="list">
        {checks.map((req) => (
          <li
            key={req.key}
            className={cn(
              "flex items-center gap-2 transition-colors",
              req.met ? "text-green-600" : "text-muted-foreground"
            )}
          >
            {req.met ? (
              <Check className="h-3 w-3 flex-shrink-0" />
            ) : (
              <X className="h-3 w-3 flex-shrink-0" />
            )}
            <span>{req.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SetupAccountPage(): React.ReactElement {
  const t = useTranslations("auth.setupAccount");
  const tErrors = useTranslations("auth.errors");

  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");
  const fallbackEmail = searchParams.get("email");
  const fallbackRoleParam = searchParams.get("role");

  const fallbackRole = useMemo(() => {
    if (fallbackRoleParam === "SELLER") return fallbackRoleParam;
    return null;
  }, [fallbackRoleParam]);

  const [pageState, setPageState] = useState<PageState>("validating");
  const [error, setError] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [redirectRoleLabel, setRedirectRoleLabel] = useState<string>("");

  const setupSchema = useMemo(
    () =>
      z
        .object({
          password: z
            .string()
            .min(8, tErrors("weakPassword"))
            .regex(/[A-Z]/, t("pwUppercase"))
            .regex(/[a-z]/, t("pwLowercase"))
            .regex(/[0-9]/, t("pwNumber")),
          confirmPassword: z.string().min(1, tErrors("required")),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: tErrors("passwordMismatch"),
          path: ["confirmPassword"],
        }),
    [t, tErrors]
  );

  type SetupAccountFormData = z.infer<typeof setupSchema>;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SetupAccountFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  const watchedPassword = useWatch({
    control,
    name: "password",
    defaultValue: "",
  });

  const handleBack = useCallback(() => {
    router.push("/admin-login");
  }, [router]);

  const validateToken = useCallback(async () => {
    if (!token) {
      setError(t("missingToken"));
      setPageState("error");
      return;
    }

    setPageState("validating");

    try {
      const response = await apiClient.get<SetupTokenValidationData>(
        "/auth/setup-account",
        { token },
        { showErrorToast: false }
      );

      if (!response.success) {
        // Non-2xx usually throws; keep for safety
        throw new ApiClientError(response.error.message, {
          code: response.error.code,
          status: response.error.status,
        });
      }

      const role = response.data.role;
      if (!isAdminRole(role)) {
        setError(t("invalidRole"));
        setPageState("error");
        return;
      }

      setAccountInfo({
        email: response.data.email,
        role,
        displayName: response.data.displayName ?? null,
      });

      setPageState("ready");
    } catch (err) {
      // Fallback to query params if token validation fails
      if (fallbackEmail && fallbackRole && isAdminRole(fallbackRole)) {
        setAccountInfo({
          email: fallbackEmail,
          role: fallbackRole,
          displayName: null,
        });
        setPageState("ready");
        return;
      }

      const apiError = err as ApiClientError;
      setError(apiError?.message ?? t("invalidOrExpired"));
      setPageState("error");
    }
  }, [fallbackEmail, fallbackRole, t, token]);

  useEffect(() => {
    void validateToken();
  }, [validateToken]);

  const onSubmit = useCallback(
    async (data: SetupAccountFormData) => {
      if (!token || !accountInfo) return;

      setPageState("submitting");
      setError(null);

      try {
        const response = await apiClient.post<SetupSuccessData>(
          "/auth/setup-account",
          {
            token,
            password: data.password,
            confirmPassword: data.confirmPassword,
          },
          { showErrorToast: false }
        );

        if (!response.success) {
          throw new ApiClientError(response.error.message, {
            code: response.error.code,
            status: response.error.status,
          });
        }

        const role = response.data.user.role;
        const roleLabel = isAdminRole(role)
          ? t(ROLE_CONFIG[role].labelKey)
          : "";
        setRedirectRoleLabel(roleLabel);

        toast.success(t("setupSuccessToast"), {
          description: t("setupSuccessToastDescription"),
        });

        setPageState("success");

        const redirectUrl =
          response.data.redirectUrl ||
          (isAdminRole(role) ? ROLE_CONFIG[role].dashboardFallbackPath : "/");

        setTimeout(() => {
          router.push(redirectUrl);
        }, REDIRECT_DELAY_MS);
      } catch (err) {
        const apiError = err as ApiClientError;
        const message = apiError?.message ?? t("setupFailed");

        setError(message);
        setPageState("ready");

        toast.error(t("setupFailedToast"), {
          description: message,
        });
      }
    },
    [accountInfo, router, t, token]
  );

  if (pageState === "validating") return <SetupFormSkeleton />;

  if (pageState === "error") {
    return (
      <ErrorView
        message={error || t("setupFailed")}
        onBack={handleBack}
        onRetry={token ? validateToken : undefined}
      />
    );
  }

  if (pageState === "success") {
    return <SuccessView roleLabel={redirectRoleLabel} />;
  }

  if (!accountInfo) return <SetupFormSkeleton />;

  const isSubmitting = pageState === "submitting";

  return (
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <div className="flex justify-center">
          <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-full">
            <ShieldCheck className="text-primary h-7 w-7" />
          </div>
        </div>

        <div className="space-y-1 text-center">
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit((values) => void onSubmit(values))}>
        <CardContent className="space-y-6">
          <AccountInfoBanner account={accountInfo} />

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="setup-password">
              {t("password")} <span className="text-destructive">*</span>
            </Label>
            <PasswordInput
              id="setup-password"
              autoComplete="new-password"
              placeholder={t("passwordPlaceholder")}
              disabled={isSubmitting}
              error={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-destructive flex items-center gap-1 text-sm">
                <AlertCircle className="h-3 w-3" />
                {errors.password.message}
              </p>
            )}
            <PasswordStrength password={watchedPassword} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="setup-confirm-password">
              {t("confirmPassword")} <span className="text-destructive">*</span>
            </Label>
            <PasswordInput
              id="setup-confirm-password"
              autoComplete="new-password"
              placeholder={t("confirmPasswordPlaceholder")}
              disabled={isSubmitting}
              error={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-destructive flex items-center gap-1 text-sm">
                <AlertCircle className="h-3 w-3" />
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              <>
                {t("completeSetup")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-muted-foreground text-center text-xs">
            {t("termsNotice")}
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
