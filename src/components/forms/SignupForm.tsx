"use client";

import React, { forwardRef, useCallback, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
  X,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/utils/toast";

const PASSWORD_MIN_LENGTH = 8;
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 50;

type PasswordRequirementKey =
  | "length"
  | "uppercase"
  | "lowercase"
  | "number"
  | "special";

type PasswordRequirement = {
  key: PasswordRequirementKey;
  regex: RegExp;
};

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { key: "length", regex: /.{8,}/ },
  { key: "uppercase", regex: /[A-Z]/ },
  { key: "lowercase", regex: /[a-z]/ },
  { key: "number", regex: /[0-9]/ },
  { key: "special", regex: /[!@#$%^&*(),.?\":{}|<>]/ },
];

const createSignupSchema = (t: (key: string) => string) =>
  z
    .object({
      firstName: z
        .string()
        .min(NAME_MIN_LENGTH, t("firstNameMin"))
        .max(NAME_MAX_LENGTH, t("firstNameMax"))
        .regex(/^[a-zA-Z\s-']+$/, t("firstNameInvalid")),
      lastName: z
        .string()
        .min(NAME_MIN_LENGTH, t("lastNameMin"))
        .max(NAME_MAX_LENGTH, t("lastNameMax"))
        .regex(/^[a-zA-Z\s-']+$/, t("lastNameInvalid")),
      email: z
        .string()
        .min(1, t("emailRequired"))
        .email(t("emailInvalid"))
        .max(255, t("emailMax")),
      password: z
        .string()
        .min(PASSWORD_MIN_LENGTH, t("passwordMin"))
        .regex(/[A-Z]/, t("passwordUppercase"))
        .regex(/[a-z]/, t("passwordLowercase"))
        .regex(/[0-9]/, t("passwordNumber")),
      confirmPassword: z.string().min(1, t("confirmPasswordRequired")),
      acceptTerms: z.boolean().refine((val) => val === true, {
        message: t("termsRequired"),
      }),
      marketingEmails: z.boolean().default(false),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("passwordsMismatch"),
      path: ["confirmPassword"],
    });

type SignupSchema = ReturnType<typeof createSignupSchema>;

export type SignupFormData = z.input<SignupSchema>;

export type SignupSubmitData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  marketingEmails: boolean;
};

export interface SignupFormProps {
  onSubmit: (data: SignupSubmitData) => Promise<boolean>;
  showSocialSignup?: boolean;
  className?: string;
  externalError?: string | null;
  onSubmitStart?: () => void;
  onSubmitEnd?: () => void;
  defaultEmail?: string;
  hideFields?: Array<"firstName" | "lastName" | "marketingEmails">;
}

export interface SignupFormRef {
  reset: () => void;
  setError: (field: keyof SignupFormData, message: string) => void;
  focus: (field: keyof SignupFormData) => void;
}

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, ...props }, ref) => {
    const tCommon = useTranslations("auth.common");
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={showPassword ? "text" : "password"}
          className={cn(
            "pr-10",
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
          aria-label={
            showPassword ? tCommon("hidePassword") : tCommon("showPassword")
          }
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff
              className="text-muted-foreground h-4 w-4"
              aria-hidden="true"
            />
          ) : (
            <Eye className="text-muted-foreground h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  description?: string;
}

function FormField({
  label,
  htmlFor,
  error,
  required,
  children,
  description,
}: FormFieldProps): React.ReactElement {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className={cn(error && "text-destructive")}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {description && !error && (
        <p className="text-muted-foreground text-xs">{description}</p>
      )}
      {error && (
        <p
          className="text-destructive flex items-center gap-1 text-sm"
          role="alert"
        >
          <AlertCircle className="h-3 w-3" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

function PasswordStrength({
  password,
}: {
  password: string;
}): React.ReactElement {
  const tCommon = useTranslations("auth.common");
  const tSignup = useTranslations("auth.signup");

  const checkRequirements = useMemo(() => {
    return PASSWORD_REQUIREMENTS.map((req) => ({
      ...req,
      met: req.regex.test(password),
    }));
  }, [password]);

  const strength = useMemo(() => {
    const metCount = checkRequirements.filter((r) => r.met).length;
    return (metCount / PASSWORD_REQUIREMENTS.length) * 100;
  }, [checkRequirements]);

  const strengthLabel = useMemo(() => {
    if (strength === 0) return tCommon("passwordStrengthEnter");
    if (strength <= 40) return tCommon("passwordStrengthWeak");
    if (strength <= 60) return tCommon("passwordStrengthFair");
    if (strength <= 80) return tCommon("passwordStrengthGood");
    return tCommon("passwordStrengthStrong");
  }, [strength, tCommon]);

  if (!password) return <></>;

  return (
    <div className="space-y-3 pt-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {tCommon("passwordStrengthLabel")}
          </span>
          <span
            className={cn(
              "font-medium",
              strength <= 40 && "text-destructive",
              strength > 40 && strength <= 60 && "text-orange-500",
              strength > 60 && strength <= 80 && "text-yellow-600",
              strength > 80 && "text-green-600"
            )}
          >
            {strengthLabel}
          </span>
        </div>
        <Progress value={strength} className="h-1.5" />
      </div>

      <ul
        className="grid gap-1 text-xs"
        role="list"
        aria-label={tSignup("passwordRequirementsAriaLabel")}
      >
        {checkRequirements.map((req) => (
          <li
            key={req.key}
            className={cn(
              "flex items-center gap-2 transition-colors",
              req.met ? "text-green-600" : "text-muted-foreground"
            )}
          >
            {req.met ? (
              <Check className="h-3 w-3" aria-hidden="true" />
            ) : (
              <X className="h-3 w-3" aria-hidden="true" />
            )}
            <span>{tSignup(`passwordRequirements.${req.key}` as Parameters<typeof tSignup>[0])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const SignupForm = forwardRef<SignupFormRef, SignupFormProps>(
  (
    {
      onSubmit,
      showSocialSignup = false,
      className,
      externalError,
      onSubmitStart,
      onSubmitEnd,
      defaultEmail = "",
      hideFields = [],
    },
    ref
  ) => {
    const t = useTranslations("auth.signup");
    const tErrors = useTranslations("auth.errors");
    const tCommon = useTranslations("auth.common");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const signupSchema = useMemo(
      () =>
        createSignupSchema((key) => {
          if (key === "emailRequired") return tErrors("required");
          if (key === "emailInvalid") return tErrors("invalidEmail");
          if (key === "passwordsMismatch") return tErrors("passwordMismatch");
          if (
            key === "passwordMin" ||
            key === "passwordUppercase" ||
            key === "passwordLowercase" ||
            key === "passwordNumber"
          )
            return tErrors("weakPassword");
          if (key === "termsRequired") return tErrors("required");
          return key;
        }),
      [tErrors]
    );

    const {
      register,
      handleSubmit,
      control,
      formState: { errors },
      reset,
      setError,
      setFocus,
    } = useForm<SignupFormData>({
      resolver: zodResolver(signupSchema),
      defaultValues: {
        firstName: "",
        lastName: "",
        email: defaultEmail,
        password: "",
        confirmPassword: "",
        acceptTerms: false,
        marketingEmails: false,
      },
      mode: "onBlur",
    });

    const watchedPassword = useWatch({
      control,
      name: "password",
      defaultValue: "",
    });

    React.useImperativeHandle(
      ref,
      () => ({
        reset: () => reset(),
        setError: (field, message) =>
          setError(field, { type: "manual", message }),
        focus: (field) => setFocus(field),
      }),
      [reset, setError, setFocus]
    );

    const handleFormSubmit = useCallback(
      async (data: SignupFormData) => {
        setIsSubmitting(true);
        setFormError(null);
        onSubmitStart?.();

        try {
          const submitData: SignupSubmitData = {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            password: data.password,
            confirmPassword: data.confirmPassword,
            marketingEmails: data.marketingEmails ?? false,
          };

          const success = await onSubmit(submitData);

          if (success) {
            toast.success(t("title"));
          } else {
            setFormError(t("genericFailure"));
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : tCommon("unknownError");

          if (message.toLowerCase().includes("email")) {
            setError("email", { type: "manual", message });
          } else {
            setFormError(message);
          }

          toast.error(message);
        } finally {
          setIsSubmitting(false);
          onSubmitEnd?.();
        }
      },
      [onSubmit, onSubmitStart, onSubmitEnd, setError, t, tCommon]
    );

    const displayError = externalError || formError;
    const showFirstName = !hideFields.includes("firstName");
    const showLastName = !hideFields.includes("lastName");
    const showMarketing = !hideFields.includes("marketingEmails");

    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>

        <form
          onSubmit={handleSubmit((data) => void handleFormSubmit(data))}
          noValidate
          aria-label={t("formAriaLabel")}
        >
          <CardContent className="space-y-4">
            {displayError && (
              <Alert variant="destructive" className="animate-in fade-in-50">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>{displayError}</AlertDescription>
              </Alert>
            )}

            {(showFirstName || showLastName) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {showFirstName && (
                  <FormField
                    label={t("firstName")}
                    htmlFor="signup-firstName"
                    error={errors.firstName?.message}
                    required
                  >
                    <div className="relative">
                      <User
                        className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                        aria-hidden="true"
                      />
                      <Input
                        id="signup-firstName"
                        autoComplete="given-name"
                        placeholder={t("firstNamePlaceholder")}
                        disabled={isSubmitting}
                        className={cn(
                          "pl-10",
                          errors.firstName && "border-destructive"
                        )}
                        {...register("firstName")}
                      />
                    </div>
                  </FormField>
                )}

                {showLastName && (
                  <FormField
                    label={t("lastName")}
                    htmlFor="signup-lastName"
                    error={errors.lastName?.message}
                    required
                  >
                    <Input
                      id="signup-lastName"
                      autoComplete="family-name"
                      placeholder={t("lastNamePlaceholder")}
                      disabled={isSubmitting}
                      className={cn(errors.lastName && "border-destructive")}
                      {...register("lastName")}
                    />
                  </FormField>
                )}
              </div>
            )}

            <FormField
              label={t("email")}
              htmlFor="signup-email"
              error={errors.email?.message}
              required
            >
              <div className="relative">
                <Mail
                  className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                  aria-hidden="true"
                />
                <Input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  placeholder={tCommon("emailPlaceholder")}
                  disabled={isSubmitting}
                  className={cn("pl-10", errors.email && "border-destructive")}
                  {...register("email")}
                />
              </div>
            </FormField>

            <FormField
              label={t("password")}
              htmlFor="signup-password"
              error={errors.password?.message}
              required
            >
              <div className="relative">
                <Lock
                  className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                  aria-hidden="true"
                />
                <PasswordInput
                  id="signup-password"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  error={!!errors.password}
                  className="pl-10"
                  {...register("password")}
                />
              </div>
              <PasswordStrength password={watchedPassword} />
            </FormField>

            <FormField
              label={t("confirmPassword")}
              htmlFor="signup-confirmPassword"
              error={errors.confirmPassword?.message}
              required
            >
              <div className="relative">
                <Lock
                  className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                  aria-hidden="true"
                />
                <PasswordInput
                  id="signup-confirmPassword"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  error={!!errors.confirmPassword}
                  className="pl-10"
                  {...register("confirmPassword")}
                />
              </div>
            </FormField>

            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Controller
                  name="acceptTerms"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="signup-terms"
                      disabled={isSubmitting}
                      className={cn(
                        "mt-0.5",
                        errors.acceptTerms && "border-destructive"
                      )}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="signup-terms"
                    className={cn(
                      "cursor-pointer text-sm leading-snug font-normal",
                      errors.acceptTerms && "text-destructive"
                    )}
                  >
                    {t("terms.prefix")}{" "}
                    <Link
                      href="/terms"
                      className="text-primary font-medium hover:underline"
                      target="_blank"
                    >
                      {t("terms.termsLink")}
                    </Link>{" "}
                    {t("terms.and")}{" "}
                    <Link
                      href="/privacy"
                      className="text-primary font-medium hover:underline"
                      target="_blank"
                    >
                      {t("terms.privacyLink")}
                    </Link>
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  {errors.acceptTerms && (
                    <p className="text-destructive text-sm" role="alert">
                      {errors.acceptTerms.message}
                    </p>
                  )}
                </div>
              </div>

              {showMarketing && (
                <div className="flex items-start space-x-3">
                  <Controller
                    name="marketingEmails"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="signup-marketing"
                        disabled={isSubmitting}
                        className="mt-0.5"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label
                    htmlFor="signup-marketing"
                    className="text-muted-foreground cursor-pointer text-sm leading-snug font-normal"
                  >
                    {t("marketingOptIn")}
                  </Label>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  {t("submitting")}
                </>
              ) : (
                t("signupButton")
              )}
            </Button>

            {showSocialSignup ? (
              <p className="text-muted-foreground text-center text-xs">
                {t("signupWith")}
              </p>
            ) : null}

            <p className="text-muted-foreground text-center text-sm">
              {t("haveAccount")}{" "}
              <Link
                href="/login"
                className="text-primary font-medium hover:underline"
                tabIndex={isSubmitting ? -1 : 0}
              >
                {t("login")}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    );
  }
);

SignupForm.displayName = "SignupForm";

export default SignupForm;
