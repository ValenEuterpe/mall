"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
  X,
} from "lucide-react";

import { useRouter } from "@/i18n/routing";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { toast } from "@/lib/utils/toast";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { UserRole } from "@/types/auth";

type PageState = "validating" | "ready" | "submitting" | "success" | "expired" | "invalid" | "error";

const REDIRECT_DELAY_SECONDS = 3;
const PASSWORD_MIN_LENGTH = 8;

type TokenValidationData = {
  email: string;
  expiresAt: string;
};

type ResetConfirmSuccessData = {
  email: string;
  role: UserRole;
  sessionsInvalidated: boolean;
  redirectUrl: string;
};

const schemaFactory = (
  t: ReturnType<typeof useTranslations>,
  tErrors: ReturnType<typeof useTranslations>
) =>
  z
    .object({
      password: z
        .string()
        .min(PASSWORD_MIN_LENGTH, tErrors("weakPassword"))
        .regex(/[A-Z]/, t("pwUppercase"))
        .regex(/[a-z]/, t("pwLowercase"))
        .regex(/[0-9]/, t("pwNumber")),
      confirmPassword: z.string().min(1, tErrors("required")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: tErrors("passwordMismatch"),
      path: ["confirmPassword"],
    });

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, ...props }, ref) => {
    const t = useTranslations("auth.resetPasswordConfirm");
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="relative">
        <Lock
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={ref}
          type={showPassword ? "text" : "password"}
          className={cn(
            "pl-10 pr-10",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? t("hidePassword") : t("showPassword")}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

function FormSkeleton(): React.ReactElement {
  return (
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <div className="flex justify-center">
          <Skeleton className="h-14 w-14 rounded-full" />
        </div>
        <div className="space-y-2 text-center">
          <Skeleton className="mx-auto h-8 w-48" />
          <Skeleton className="mx-auto h-4 w-64" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-11 w-full" />
      </CardFooter>
    </Card>
  );
}

function SuccessView({
  redirectCountdown,
  onGoToLogin,
}: {
  redirectCountdown: number;
  onGoToLogin: () => void;
}): React.ReactElement {
  const t = useTranslations("auth.resetPasswordConfirm");

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>

        <h2 className="mb-2 text-2xl font-bold">{t("successTitle")}</h2>
        <p className="mb-6 text-muted-foreground">{t("successSubtitle")}</p>

        {redirectCountdown > 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("redirectCountdown", { seconds: redirectCountdown })}
          </div>
        ) : (
          <Button onClick={onGoToLogin} className="gap-2">
            {t("goToLogin")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}

        {redirectCountdown > 0 && (
          <button
            onClick={onGoToLogin}
            className="mt-4 text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {t("skipCountdown")}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function ErrorView({
  type,
  message,
  onRequestNew,
}: {
  type: "expired" | "invalid" | "error";
  message: string;
  onRequestNew: () => void;
}): React.ReactElement {
  const t = useTranslations("auth.resetPasswordConfirm");

  const config = {
    expired: {
      icon: Clock,
      iconColor: "text-orange-600",
      iconBg: "bg-orange-100 dark:bg-orange-900/20",
      title: t("expiredTitle"),
    },
    invalid: {
      icon: AlertCircle,
      iconColor: "text-destructive",
      iconBg: "bg-destructive/10",
      title: t("invalidTitle"),
    },
    error: {
      icon: AlertCircle,
      iconColor: "text-destructive",
      iconBg: "bg-destructive/10",
      title: t("errorTitle"),
    },
  }[type];

  const Icon = config.icon;

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className={cn("mb-6 flex h-20 w-20 items-center justify-center rounded-full", config.iconBg)}>
          <Icon className={cn("h-10 w-10", config.iconColor)} />
        </div>

        <h2 className="mb-2 text-2xl font-bold">{config.title}</h2>
        <p className="mb-6 max-w-sm text-muted-foreground">{message}</p>

        <Button onClick={onRequestNew} className="gap-2">
          {t("requestNew")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function PasswordStrength({ password }: { password: string }): React.ReactElement | null {
  const t = useTranslations("auth.resetPasswordConfirm");

  const requirements = useMemo(
    () => [
      { key: "length", label: t("reqLength"), regex: /.{8,}/, required: true },
      { key: "uppercase", label: t("reqUppercase"), regex: /[A-Z]/, required: true },
      { key: "lowercase", label: t("reqLowercase"), regex: /[a-z]/, required: true },
      { key: "number", label: t("reqNumber"), regex: /[0-9]/, required: true },
      { key: "special", label: t("reqSpecial"), regex: /[!@#$%^&*(),.?\":{}|<>]/, required: false },
    ],
    [t]
  );

  const checks = useMemo(
    () => requirements.map((r) => ({ ...r, met: r.regex.test(password) })),
    [requirements, password]
  );

  const strength = useMemo(() => {
    const requiredChecks = checks.filter((c) => c.required);
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
            {req.met ? <Check className="h-3 w-3 flex-shrink-0" /> : <X className="h-3 w-3 flex-shrink-0" />}
            <span>
              {req.label}
              {!req.required ? ` (${t("recommended")})` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ResetPasswordConfirmPage(): React.ReactElement {
  const t = useTranslations("auth.resetPasswordConfirm");
  const tErrors = useTranslations("auth.errors");

  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");

  const schema = useMemo(() => schemaFactory(t, tErrors), [t, tErrors]);
  type FormData = z.infer<typeof schema>;

  const [pageState, setPageState] = useState<PageState>("validating");
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(0);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onBlur",
  });

  const watchedPassword = useWatch({ control, name: "password", defaultValue: "" });

  const validateToken = useCallback(async () => {
    if (!token) {
      setPageState("invalid");
      setError(t("missingToken"));
      return;
    }

    setPageState("validating");

    try {
      // Backend supports GET /auth/reset-password/confirm?token=...
      const response = await apiClient.get<TokenValidationData>(
        "/auth/reset-password/confirm",
        { token },
        { showErrorToast: false }
      );

      if (!response.success) {
        throw new ApiClientError(response.error.message, {
          code: response.error.code,
          status: response.error.status,
        });
      }

      setUserEmail(response.data.email || null);
      setPageState("ready");
    } catch (err) {
      const apiError = err as ApiClientError;

      if (apiError.code === "TOKEN_EXPIRED") {
        setPageState("expired");
        setError(t("expiredMessage"));
      } else if (apiError.code === "INVALID_TOKEN" || apiError.code === "TOKEN_NOT_FOUND") {
        setPageState("invalid");
        setError(t("invalidMessage"));
      } else {
        // If GET validation fails unexpectedly, allow proceeding; POST will validate.
        setPageState("ready");
      }
    }
  }, [t, token]);

  useEffect(() => {
    void validateToken();
  }, [validateToken]);

  useEffect(() => {
    if (pageState !== "success" || redirectCountdown <= 0) return;

    if (redirectCountdown === 1) {
      router.push("/login?reset=success");
      return;
    }

    const timer = setTimeout(() => setRedirectCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [pageState, redirectCountdown, router]);

  const onSubmit = useCallback(
    async (data: FormData) => {
      if (!token) return;

      setPageState("submitting");
      setError(null);

      try {
        const response = await apiClient.post<ResetConfirmSuccessData>(
          "/auth/reset-password/confirm",
          { token, password: data.password, confirmPassword: data.confirmPassword },
          { showErrorToast: false }
        );

        if (!response.success) {
          throw new ApiClientError(response.error.message, {
            code: response.error.code,
            status: response.error.status,
          });
        }

        toast.success(t("toastSuccessTitle"), {
          description: t("toastSuccessDescription"),
        });

        setPageState("success");
        setRedirectCountdown(REDIRECT_DELAY_SECONDS);
      } catch (err) {
        const apiError = err as ApiClientError;

        if (apiError.code === "TOKEN_EXPIRED") {
          setPageState("expired");
          setError(t("expiredMessage"));
          return;
        }

        const message = apiError.message || t("errorMessage");
        setError(message);
        setPageState("ready");

        toast.error(t("toastErrorTitle"), { description: message });
      }
    },
    [t, token]
  );

  const goToLogin = useCallback(() => {
    router.push("/login");
  }, [router]);

  const requestNew = useCallback(() => {
    router.push("/reset-password");
  }, [router]);

  if (pageState === "validating") return <FormSkeleton />;

  if (pageState === "success") {
    return <SuccessView redirectCountdown={redirectCountdown} onGoToLogin={goToLogin} />;
  }

  if (pageState === "expired" || pageState === "invalid") {
    return <ErrorView type={pageState} message={error || t("errorMessage")} onRequestNew={requestNew} />;
  }

  const isSubmitting = pageState === "submitting";

  return (
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
        </div>

        <div className="space-y-1 text-center">
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>
            {userEmail ? t("subtitleWithEmail", { email: userEmail }) : t("subtitle")}
          </CardDescription>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit((values) => void onSubmit(values))}>
        <CardContent className="space-y-6">
          {error && pageState === "ready" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-password">
              {t("newPassword")} <span className="text-destructive">*</span>
            </Label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              placeholder={t("newPasswordPlaceholder")}
              disabled={isSubmitting}
              error={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <p className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                {errors.password.message}
              </p>
            )}
            <PasswordStrength password={watchedPassword} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">
              {t("confirmNewPassword")} <span className="text-destructive">*</span>
            </Label>
            <PasswordInput
              id="confirm-new-password"
              autoComplete="new-password"
              placeholder={t("confirmNewPasswordPlaceholder")}
              disabled={isSubmitting}
              error={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              <>
                {t("resetPassword")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export function ResetPasswordConfirmSkeleton() {
  return <FormSkeleton />;
}
