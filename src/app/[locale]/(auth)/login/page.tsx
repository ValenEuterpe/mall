"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";

import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/hooks/use-auth";
import { LoginForm, type LoginFormData } from "@/components/forms/LoginForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface LoginPageContentProps {
  callbackUrl: string;
  errorMessage: string | null;
}

const DEFAULT_REDIRECT = "/";
const REDIRECT_DELAY_MS = 100;

const ERROR_MESSAGES: Record<string, string> = {
  session_expired: "sessionExpired",
  unauthorized: "unauthorized",
  account_locked: "accountLocked",
  verification_required: "verificationRequired",
};

function LoginFormSkeleton(): React.ReactElement {
  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

function LoginPageContent({
  callbackUrl,
  errorMessage,
}: LoginPageContentProps): React.ReactElement {
  const t = useTranslations("auth.loginPage");

  const router = useRouter();
  const { user, isLoading, login, isAuthenticated } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(errorMessage);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const timer = setTimeout(() => {
        router.replace(callbackUrl);
      }, REDIRECT_DELAY_MS);

      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, user, router, callbackUrl]);

  const handleLogin = useCallback(
    async (data: LoginFormData): Promise<boolean> => {
      setIsSubmitting(true);
      setLoginError(null);

      try {
        const authedUser = await login({
          email: data.email,
          password: data.password,
          rememberMe: data.rememberMe,
        });

        if (authedUser) return true;

        setLoginError(t("invalidCredentials"));
        return false;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t("unknownError");
        setLoginError(message);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [login, t]
  );

  const handleSubmitStart = useCallback(() => {
    setLoginError(null);
  }, []);

  if (isLoading) {
    return <LoginFormSkeleton />;
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-8">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        <p className="text-muted-foreground text-sm">{t("redirecting")}</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {errorMessage && (
        <Alert variant="destructive" className="animate-in fade-in-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <LoginForm
        onSubmit={handleLogin}
        redirectPath={callbackUrl}
        externalError={loginError}
        onSubmitStart={handleSubmitStart}
        showRememberMe
        showSocialLogin={false}
        className={isSubmitting ? "pointer-events-none opacity-95" : undefined}
      />
    </div>
  );
}

function LoginPageWithParams(): React.ReactElement {
  const t = useTranslations("auth.loginPage");
  const searchParams = useSearchParams();

  const callbackUrl = useMemo(() => {
    const url = searchParams.get("callbackUrl");

    if (url) {
      try {
        const parsed = new URL(url, window.location.origin);
        if (parsed.origin === window.location.origin) {
          return parsed.pathname + parsed.search;
        }
      } catch {
        // ignore invalid URL
      }
    }

    return DEFAULT_REDIRECT;
  }, [searchParams]);

  const errorMessage = useMemo(() => {
    const errorCode = searchParams.get("error");
    if (!errorCode) return null;

    const key = ERROR_MESSAGES[errorCode];
    return key ? t(key as Parameters<typeof t>[0]) : null;
  }, [searchParams, t]);

  return (
    <LoginPageContent callbackUrl={callbackUrl} errorMessage={errorMessage} />
  );
}

export default function LoginPage(): React.ReactElement {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginPageWithParams />
    </Suspense>
  );
}
