"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { useRouter } from "@/i18n/routing";
import { toast } from "@/lib/utils/toast";
import { useAuth } from "@/hooks/use-auth";
import {
  SignupForm,
  type SignupSubmitData,
} from "@/components/forms/SignupForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

type SignupState = "idle" | "submitting" | "success" | "error";

function SignupFormSkeleton(): React.ReactElement {
  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

function SuccessMessage({
  email,
  onResendVerification,
}: {
  email: string;
  onResendVerification: () => Promise<void>;
}): React.ReactElement {
  const t = useTranslations("auth.signupPage");

  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown((prev) => prev - 1),
        1000
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    try {
      await onResendVerification();
      setResendCooldown(60);
      toast.success(t("resendSuccess"));
    } catch {
      toast.error(t("resendError"));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 py-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold">{t("checkEmailTitle")}</h2>
        <p className="text-muted-foreground">
          {t("checkEmailBody", { email })}
        </p>
      </div>

      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">{t("checkEmailHint")}</p>

        <button
          onClick={handleResend}
          disabled={resendCooldown > 0 || isResending}
          className="text-primary text-sm font-medium hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isResending
            ? t("sending")
            : resendCooldown > 0
              ? t("resendIn", { seconds: resendCooldown })
              : t("resendCta")}
        </button>
      </div>
    </div>
  );
}

function SignupPageContent({
  inviteCode,
  prefillEmail,
}: {
  inviteCode: string | null;
  prefillEmail: string | null;
}): React.ReactElement {
  const t = useTranslations("auth.signupPage");
  const locale = useLocale();

  const router = useRouter();
  const {
    isAuthenticated,
    isLoading: authLoading,
    signup,
    resendVerification,
  } = useAuth();

  const [signupState, setSignupState] = useState<SignupState>("idle");
  const [signupError, setSignupError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string>("");

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSignup = useCallback(
    async (data: SignupSubmitData): Promise<boolean> => {
      setSignupState("submitting");
      setSignupError(null);

      try {
        // Backend expects { email, firstName, lastName, password, confirmPassword, locale }
        const createdUser = await signup({
          email: data.email,
          password: data.password,
          confirmPassword: data.confirmPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          locale,
        });

        if (createdUser) {
          setRegisteredEmail(data.email);
          setSignupState("success");

          toast.success(t("signupSuccessTitle"));
          return true;
        }

        setSignupError(t("signupFailed"));
        setSignupState("error");
        return false;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t("unknownError");

        setSignupError(message);
        setSignupState("error");

        toast.error(t("signupErrorTitle"), { description: message });

        return false;
      }
    },
    [signup, t]
  );

  const handleResendVerification = useCallback(async (): Promise<void> => {
    if (!registeredEmail) return;

    const ok = await resendVerification(registeredEmail);
    if (!ok) {
      throw new Error("Resend failed");
    }
  }, [registeredEmail, resendVerification]);

  const handleSubmitStart = useCallback(() => {
    setSignupError(null);
    setSignupState("submitting");
  }, []);

  const handleSubmitEnd = useCallback(() => {
    setSignupState((prev) => (prev === "submitting" ? "idle" : prev));
  }, []);

  if (authLoading) {
    return <SignupFormSkeleton />;
  }

  if (isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-8">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        <p className="text-muted-foreground text-sm">{t("alreadyLoggedIn")}</p>
      </div>
    );
  }

  if (signupState === "success" && registeredEmail) {
    return (
      <SuccessMessage
        email={registeredEmail}
        onResendVerification={handleResendVerification}
      />
    );
  }

  return (
    <div className="w-full space-y-4">
      {inviteCode && (
        <Alert className="border-primary/20 bg-primary/5">
          <CheckCircle2 className="text-primary h-4 w-4" />
          <AlertDescription>{t("inviteBanner")}</AlertDescription>
        </Alert>
      )}

      {signupError && (
        <Alert variant="destructive" className="animate-in fade-in-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{signupError}</AlertDescription>
        </Alert>
      )}

      <SignupForm
        onSubmit={handleSignup}
        externalError={null}
        defaultEmail={prefillEmail || undefined}
        onSubmitStart={handleSubmitStart}
        onSubmitEnd={handleSubmitEnd}
        showSocialSignup={false}
      />
    </div>
  );
}

function SignupPageWithParams(): React.ReactElement {
  const searchParams = useSearchParams();

  const inviteCode = useMemo(
    () => searchParams.get("invite") || searchParams.get("code") || null,
    [searchParams]
  );

  const prefillEmail = useMemo(() => {
    const email = searchParams.get("email");
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return email;
    return null;
  }, [searchParams]);

  return (
    <SignupPageContent inviteCode={inviteCode} prefillEmail={prefillEmail} />
  );
}

export default function SignupPage(): React.ReactElement {
  return (
    <Suspense fallback={<SignupFormSkeleton />}>
      <SignupPageWithParams />
    </Suspense>
  );
}
