"use client";

import React, { forwardRef, useCallback, useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/utils/toast";

const createLoginSchema = (t: (key: string) => string) =>
  z.object({
    email: z.string().min(1, t("emailRequired")).email(t("emailInvalid")),
    password: z.string().min(1, t("passwordRequired")),
    rememberMe: z.boolean().default(false),
  });

type LoginSchema = ReturnType<typeof createLoginSchema>;

export type LoginFormData = z.input<LoginSchema>;

export type LoginSubmitData = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export interface LoginFormProps {
  onSubmit: (data: LoginSubmitData) => Promise<boolean>;
  redirectPath?: string;
  showSocialLogin?: boolean;
  showRememberMe?: boolean;
  className?: string;
  defaultEmail?: string;
  externalError?: string | null;
  onSubmitStart?: () => void;
  onSubmitEnd?: () => void;
}

export interface LoginFormRef {
  reset: () => void;
  setError: (field: keyof LoginFormData, message: string) => void;
  focus: (field: keyof LoginFormData) => void;
}

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(({ className, error, ...props }, ref) => {
  const tCommon = useTranslations("auth.common");

  const [showPassword, setShowPassword] = useState(false);
  const inputId = useId();

  const toggleVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  return (
    <div className="relative">
      <Input
        ref={ref}
        id={inputId}
        type={showPassword ? "text" : "password"}
        className={cn("pr-10", error && "border-destructive focus-visible:ring-destructive", className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
        onClick={toggleVisibility}
        aria-label={showPassword ? tCommon("hidePassword") : tCommon("showPassword")}
        aria-controls={inputId}
        tabIndex={-1}
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
});

PasswordInput.displayName = "PasswordInput";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  description?: string;
  rightElement?: React.ReactNode;
}

function FormField({ label, htmlFor, error, required, children, description, rightElement }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={htmlFor} className={cn(error && "text-destructive")}>
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
        {rightElement}
      </div>
      {children}
      {description && !error && <p className="text-xs text-muted-foreground">{description}</p>}
      {error && (
        <p className="flex items-center gap-1 text-sm text-destructive" role="alert" aria-live="polite">
          <AlertCircle className="h-3 w-3" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export const LoginForm = forwardRef<LoginFormRef, LoginFormProps>(
  (
    {
      onSubmit,
      redirectPath,
      showSocialLogin = false,
      showRememberMe = true,
      className,
      defaultEmail = "",
      externalError,
      onSubmitStart,
      onSubmitEnd,
    },
    ref
  ) => {
    const t = useTranslations("auth.login");
    const tErrors = useTranslations("auth.errors");
    const tCommon = useTranslations("auth.common");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const loginSchema = useMemo(
      () =>
        createLoginSchema((key) => {
          if (key === "emailRequired" || key === "passwordRequired") return tErrors("required");
          if (key === "emailInvalid") return tErrors("invalidEmail");
          return key;
        }),
      [tErrors]
    );

    const {
      register,
      handleSubmit,
      formState: { errors },
      reset,
      setError,
      setFocus,
    } = useForm<LoginFormData>({
      resolver: zodResolver(loginSchema),
      defaultValues: {
        email: defaultEmail,
        password: "",
        rememberMe: false,
      },
      mode: "onBlur",
    });

    React.useImperativeHandle(
      ref,
      () => ({
        reset: () => reset(),
        setError: (field, message) => setError(field, { type: "manual", message }),
        focus: (field) => setFocus(field),
      }),
      [reset, setError, setFocus]
    );

    const handleFormSubmit = useCallback(
      async (data: LoginFormData) => {
        setIsSubmitting(true);
        setFormError(null);
        onSubmitStart?.();

        try {
          const payload: LoginSubmitData = {
            email: data.email,
            password: data.password,
            rememberMe: data.rememberMe ?? false,
          };

          const success = await onSubmit(payload);

          if (success) {
            toast.success(t("title"));
            void redirectPath;
            return;
          }

          setFormError(tErrors("invalidCredentials"));
          setFocus("email");
        } catch (error) {
          const message = error instanceof Error ? error.message : tCommon("unknownError");
          setFormError(message);
          toast.error(message);
        } finally {
          setIsSubmitting(false);
          onSubmitEnd?.();
        }
      },
      [onSubmit, onSubmitEnd, onSubmitStart, redirectPath, setFocus, t, tCommon, tErrors]
    );

    const displayError = externalError || formError;

    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit((d) => void handleFormSubmit(d))} noValidate aria-label={t("formAriaLabel")}>
          <CardContent className="space-y-4">
            {displayError && (
              <Alert variant="destructive" className="animate-in fade-in-50">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>{displayError}</AlertDescription>
              </Alert>
            )}

            <FormField label={t("email")} htmlFor="login-email" error={errors.email?.message} required>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder={tCommon("emailPlaceholder")}
                  disabled={isSubmitting}
                  className={cn("pl-10", errors.email && "border-destructive focus-visible:ring-destructive")}
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
              </div>
            </FormField>

            <FormField
              label={t("password")}
              htmlFor="login-password"
              error={errors.password?.message}
              required
              rightElement={
                <Link
                  href="/reset-password"
                  className="text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  tabIndex={isSubmitting ? -1 : 0}
                >
                  {t("forgotPassword")}
                </Link>
              }
            >
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <PasswordInput
                  id="login-password"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  error={!!errors.password}
                  className="pl-10"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
              </div>
            </FormField>

            {showRememberMe && (
              <div className="flex items-center space-x-2">
                <Checkbox id="login-remember" disabled={isSubmitting} {...register("rememberMe")} />
                <Label htmlFor="login-remember" className="cursor-pointer text-sm font-normal text-muted-foreground">
                  {t("rememberMe")}
                </Label>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  {t("submitting")}
                </>
              ) : (
                t("loginButton")
              )}
            </Button>

            {showSocialLogin ? <p className="text-center text-xs text-muted-foreground">{t("loginWith")}</p> : null}

            <p className="text-center text-sm text-muted-foreground">
              {t("noAccount")} {" "}
              <Link
                href="/signup"
                className="font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                tabIndex={isSubmitting ? -1 : 0}
              >
                {t("signup")}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    );
  }
);

LoginForm.displayName = "LoginForm";

export default LoginForm;
