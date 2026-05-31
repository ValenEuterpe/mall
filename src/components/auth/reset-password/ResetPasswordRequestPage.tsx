"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react";

import { useRouter } from "@/i18n/routing";
import { apiClient } from "@/lib/api-client";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type PageState = "idle" | "submitting" | "success";

type ResetRequestData = {
  emailSent: boolean;
  expiresIn: string;
};

type ResetRequestFormData = {
  email: string;
};

const RESEND_COOLDOWN_SECONDS = 60;

function ResetFormSkeleton(): React.ReactElement {
  return (
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <div className="flex justify-center">
          <Skeleton className="h-14 w-14 rounded-full" />
        </div>
        <div className="space-y-2 text-center">
          <Skeleton className="mx-auto h-8 w-40" />
          <Skeleton className="mx-auto h-4 w-64" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
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
  email,
  onResend,
  onBack,
}: {
  email: string;
  onResend: () => Promise<void>;
  onBack: () => void;
}): React.ReactElement {
  const t = useTranslations("auth.resetPasswordRequest");

  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    try {
      await onResend();
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success(t("resendSuccess"));
    } catch {
      toast.error(t("resendError"));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
        </div>

        <div className="space-y-2">
          <CardTitle className="text-2xl">{t("successTitle")}</CardTitle>
          <CardDescription className="text-base">
            {t("successSubtitle")}
          </CardDescription>
        </div>

        <div className="bg-muted inline-flex items-center justify-center gap-2 rounded-full px-4 py-2">
          <Mail className="text-muted-foreground h-4 w-4" />
          <span className="font-medium">{email}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 text-center">
        <p className="text-muted-foreground text-sm">{t("instructions")}</p>

        <Alert className="text-left">
          <Mail className="h-4 w-4" />
          <AlertDescription>{t("hint")}</AlertDescription>
        </Alert>
      </CardContent>

      <CardFooter className="flex flex-col gap-4">
        <Button
          variant="outline"
          onClick={() => void handleResend()}
          disabled={cooldown > 0 || isResending}
          className="w-full gap-2"
        >
          {isResending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {cooldown > 0
            ? t("resendIn", { seconds: cooldown })
            : t("resendEmail")}
        </Button>

        <Button variant="ghost" onClick={onBack} className="w-full gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t("tryDifferentEmail")}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function ResetPasswordRequestPage(): React.ReactElement {
  const t = useTranslations("auth.resetPasswordRequest");
  const tErrors = useTranslations("auth.errors");

  const router = useRouter();
  const searchParams = useSearchParams();

  const prefillEmail = useMemo(() => {
    const email = searchParams.get("email");
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return email;
    return "";
  }, [searchParams]);

  const schema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .min(1, tErrors("required"))
          .email(tErrors("invalidEmail")),
      }),
    [tErrors]
  );

  const [pageState, setPageState] = useState<PageState>("idle");
  const [submittedEmail, setSubmittedEmail] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    getValues,
  } = useForm<ResetRequestFormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: prefillEmail },
    mode: "onBlur",
  });

  const onSubmit = useCallback(
    async (data: ResetRequestFormData) => {
      setPageState("submitting");

      try {
        await apiClient.post<ResetRequestData>(
          "/auth/reset-password/request",
          { email: data.email },
          { showErrorToast: false }
        );

        // Always show success (email enumeration protection)
        setSubmittedEmail(data.email);
        setPageState("success");
        toast.success(t("toastSuccess"), {
          description: t("toastSuccessDescription"),
        });
      } catch {
        // Still show success (email enumeration protection)
        setSubmittedEmail(data.email);
        setPageState("success");
        toast.success(t("toastGenericSuccess"));
      }
    },
    [t]
  );

  const handleResend = useCallback(async () => {
    const email = submittedEmail || getValues("email");
    if (!email) return;

    await apiClient.post(
      "/auth/reset-password/request",
      { email },
      { showErrorToast: false }
    );
  }, [getValues, submittedEmail]);

  const handleBack = useCallback(() => {
    setPageState("idle");
    setSubmittedEmail("");
    reset({ email: "" });
  }, [reset]);

  const handleBackToLogin = useCallback(() => {
    router.push("/login");
  }, [router]);

  if (pageState === "success" && submittedEmail) {
    return (
      <SuccessView
        email={submittedEmail}
        onResend={handleResend}
        onBack={handleBack}
      />
    );
  }

  const isSubmitting = pageState === "submitting";

  return (
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <div className="flex justify-center">
          <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-full">
            <KeyRound className="text-primary h-7 w-7" />
          </div>
        </div>

        <div className="space-y-1 text-center">
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit((values) => void onSubmit(values))}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">{t("emailLabel")}</Label>
            <div className="relative">
              <Mail
                className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                placeholder={t("emailPlaceholder")}
                disabled={isSubmitting}
                className={cn(
                  "pl-10",
                  errors.email &&
                    "border-destructive focus-visible:ring-destructive"
                )}
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="text-destructive flex items-center gap-1 text-sm">
                <AlertCircle className="h-3 w-3" />
                {errors.email.message}
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
                {t("sending")}
              </>
            ) : (
              <>
                {t("sendLink")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleBackToLogin}
            className="w-full gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToLogin")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export function ResetPasswordRequestSkeleton() {
  return <ResetFormSkeleton />;
}
