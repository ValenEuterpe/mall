"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  RefreshCw,
  XCircle,
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type VerificationState =
  | "verifying"
  | "success"
  | "expired"
  | "invalid"
  | "alreadyVerified"
  | "error";

const REDIRECT_DELAY_MS = 5000;
const RESEND_COOLDOWN_SECONDS = 60;

type VerifyEmailSuccessData = {
  email: string;
  verifiedAt: string;
  isNewVerification: boolean;
};

type StateConfig = {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  titleKey:
    | "titleVerifying"
    | "titleSuccess"
    | "titleExpired"
    | "titleInvalid"
    | "titleAlreadyVerified"
    | "titleError";
  showResend: boolean;
  showLogin: boolean;
  autoRedirect: boolean;
};

const STATE_CONFIG: Record<VerificationState, StateConfig> = {
  verifying: {
    icon: Loader2,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    titleKey: "titleVerifying",
    showResend: false,
    showLogin: false,
    autoRedirect: false,
  },
  success: {
    icon: CheckCircle2,
    iconColor: "text-green-600",
    iconBg: "bg-green-100 dark:bg-green-900/20",
    titleKey: "titleSuccess",
    showResend: false,
    showLogin: true,
    autoRedirect: true,
  },
  expired: {
    icon: Clock,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-100 dark:bg-orange-900/20",
    titleKey: "titleExpired",
    showResend: true,
    showLogin: true,
    autoRedirect: false,
  },
  invalid: {
    icon: XCircle,
    iconColor: "text-destructive",
    iconBg: "bg-destructive/10",
    titleKey: "titleInvalid",
    showResend: true,
    showLogin: true,
    autoRedirect: false,
  },
  alreadyVerified: {
    icon: CheckCircle2,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100 dark:bg-blue-900/20",
    titleKey: "titleAlreadyVerified",
    showResend: false,
    showLogin: true,
    autoRedirect: true,
  },
  error: {
    icon: AlertCircle,
    iconColor: "text-destructive",
    iconBg: "bg-destructive/10",
    titleKey: "titleError",
    showResend: true,
    showLogin: true,
    autoRedirect: false,
  },
};

function VerificationSkeleton(): React.ReactElement {
  return (
    <Card className="w-full">
      <CardHeader className="space-y-4 text-center">
        <div className="flex justify-center">
          <Skeleton className="h-20 w-20 rounded-full" />
        </div>
        <Skeleton className="mx-auto h-8 w-48" />
        <Skeleton className="mx-auto h-4 w-64" />
      </CardHeader>
      <CardContent className="flex justify-center">
        <Skeleton className="h-10 w-32" />
      </CardContent>
    </Card>
  );
}

function CountdownTimer({ seconds }: { seconds: number }): React.ReactElement {
  const t = useTranslations("auth.verifyEmail");
  return (
    <div className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{t("redirectCountdown", { seconds })}</span>
    </div>
  );
}

function ResendButton({
  email,
  disabled,
}: {
  email: string | null;
  disabled?: boolean;
}): React.ReactElement {
  const t = useTranslations("auth.verifyEmail");

  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0 || isResending) return;

    setIsResending(true);

    try {
      const response = await apiClient.put<{
        email: string;
        expiresAt: string;
      }>("/auth/verify-email", { email }, { showErrorToast: false });

      if (response.success) {
        toast.success(t("resendSuccessTitle"), {
          description: t("resendSuccessDescription"),
        });
        setCooldown(RESEND_COOLDOWN_SECONDS);
        return;
      }

      // Should not happen for non-2xx, but keep safe
      toast.error(t("resendErrorTitle"));
    } catch (err) {
      const apiError = err as ApiClientError;

      if (apiError.status === 409 && apiError.code === "ALREADY_VERIFIED") {
        toast.info(t("alreadyVerifiedToastTitle"), {
          description: t("alreadyVerifiedToastDescription"),
        });
        setCooldown(RESEND_COOLDOWN_SECONDS);
        return;
      }

      toast.error(t("resendErrorTitle"), {
        description: apiError.message,
      });
    } finally {
      setIsResending(false);
    }
  };

  const isDisabled = disabled || !email || cooldown > 0 || isResending;

  return (
    <Button
      variant="outline"
      onClick={() => void handleResend()}
      disabled={isDisabled}
      className="gap-2"
    >
      {isResending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      {cooldown > 0 ? t("resendIn", { seconds: cooldown }) : t("resendEmail")}
    </Button>
  );
}

export default function VerifyEmailPage(): React.ReactElement {
  const t = useTranslations("auth.verifyEmail");

  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [state, setState] = useState<VerificationState>("verifying");
  const [message, setMessage] = useState<string>("");
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(
    null
  );

  const config = STATE_CONFIG[state];
  const Icon = config.icon;

  const goToLogin = useCallback(() => {
    router.push("/login?verified=true");
  }, [router]);

  const verifyEmail = useCallback(
    async (verificationToken: string) => {
      setState("verifying");

      try {
        const response = await apiClient.post<VerifyEmailSuccessData>(
          "/auth/verify-email",
          { token: verificationToken },
          { showErrorToast: false }
        );

        if (response.success) {
          const isNew = response.data.isNewVerification;

          if (!isNew) {
            setState("alreadyVerified");
            setMessage(t("alreadyVerifiedMessage"));
          } else {
            setState("success");
            setMessage(t("successMessage"));
            toast.success(t("verifiedToastTitle"), {
              description: t("verifiedToastDescription"),
            });
          }

          return;
        }

        // Non-success envelope; classify based on message.
        const msg = response.error.message?.toLowerCase?.() ?? "";
        if (msg.includes("expired")) {
          setState("expired");
          setMessage(t("expiredMessage"));
        } else if (msg.includes("invalid") || msg.includes("not")) {
          setState("invalid");
          setMessage(t("invalidMessage"));
        } else {
          setState("error");
          setMessage(response.error.message ?? t("errorMessage"));
        }
      } catch (err) {
        const apiError = err as ApiClientError;

        // Prefer server error codes when available
        const code = apiError.code;
        if (code === "TOKEN_EXPIRED") {
          setState("expired");
          setMessage(t("expiredMessage"));
        } else if (code === "INVALID_TOKEN" || code === "TOKEN_NOT_FOUND") {
          setState("invalid");
          setMessage(t("invalidMessage"));
        } else {
          setState("error");
          setMessage(apiError.message || t("errorMessage"));
        }

        toast.error(t("verifyFailedToastTitle"), {
          description: t("verifyFailedToastDescription"),
        });
      }
    },
    [t]
  );

  useEffect(() => {
    if (!token) {
      setState("invalid");
      setMessage(t("missingTokenMessage"));
      return;
    }

    void verifyEmail(token);
  }, [token, verifyEmail, t]);

  useEffect(() => {
    if (config.autoRedirect && redirectCountdown === null) {
      setRedirectCountdown(REDIRECT_DELAY_MS / 1000);
    }
  }, [config.autoRedirect, redirectCountdown]);

  useEffect(() => {
    if (redirectCountdown === null) return;

    if (redirectCountdown <= 0) {
      goToLogin();
      return;
    }

    const timer = setTimeout(() => {
      setRedirectCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [goToLogin, redirectCountdown]);

  return (
    <Card className="w-full">
      <CardHeader className="space-y-6 text-center">
        <div className="flex justify-center">
          <div
            className={cn(
              "flex h-20 w-20 items-center justify-center rounded-full",
              config.iconBg
            )}
          >
            <Icon
              className={cn(
                "h-10 w-10",
                config.iconColor,
                state === "verifying" && "animate-spin"
              )}
            />
          </div>
        </div>

        <div className="space-y-2">
          <CardTitle className="text-2xl">{t(config.titleKey)}</CardTitle>
          <CardDescription className="text-base">{message}</CardDescription>
        </div>

        {email && state !== "verifying" && (
          <div className="bg-muted inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm">
            <Mail className="text-muted-foreground h-4 w-4" />
            <span className="font-medium">{email}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {redirectCountdown !== null && redirectCountdown > 0 && (
          <CountdownTimer seconds={redirectCountdown} />
        )}

        {(config.showLogin || config.showResend) && (
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {config.showResend && (
              <ResendButton email={email} disabled={state === "verifying"} />
            )}

            {config.showLogin && (
              <Button onClick={goToLogin} className="gap-2">
                {t("goToLogin")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {redirectCountdown !== null && redirectCountdown > 0 && (
          <button
            onClick={goToLogin}
            className="text-muted-foreground mx-auto block text-sm underline-offset-4 hover:underline"
          >
            {t("skipCountdown")}
          </button>
        )}
      </CardContent>

      {(state === "expired" || state === "invalid" || state === "error") && (
        <CardFooter className="justify-center border-t pt-6">
          <p className="text-muted-foreground text-center text-sm">
            {t("helpText")}{" "}
            <a
              href="/support"
              className="text-primary font-medium hover:underline"
            >
              {t("contactSupport")}
            </a>
          </p>
        </CardFooter>
      )}
    </Card>
  );
}

export function VerifyEmailPageSkeleton() {
  return <VerificationSkeleton />;
}
