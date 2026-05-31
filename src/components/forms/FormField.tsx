"use client";

import type { ReactNode } from "react";
import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Controller,
  type FieldErrors,
  type FieldValues,
  useFormContext,
} from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AlertCircle, Eye, EyeOff, HelpCircle } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
}

interface BaseFieldProps {
  /** Field name (supports nested paths like "address.city") */
  name: string;
  /** Field label */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether field is required */
  required?: boolean;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Whether field is read-only */
  readOnly?: boolean;
  /** Description text shown below the field */
  description?: string;
  /** Tooltip help text */
  helpText?: string;
  /** Additional CSS classes for the wrapper */
  className?: string;
  /** Additional CSS classes for the input */
  inputClassName?: string;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Hide the label visually (still accessible) */
  hideLabel?: boolean;
}

interface TextFieldProps extends BaseFieldProps {
  type?:
    | "text"
    | "email"
    | "password"
    | "tel"
    | "url"
    | "date"
    | "time"
    | "datetime-local"
    | "color";
  /** Icon to show at the start of the input */
  startIcon?: ReactNode;
  /** Icon to show at the end of the input */
  endIcon?: ReactNode;
  /** Prefix text (e.g., "$") */
  prefix?: string;
  /** Suffix text (e.g., "kg") */
  suffix?: string;
  /** Maximum character length */
  maxLength?: number;
  /** Show character count */
  showCharacterCount?: boolean;
  /** Pattern for validation */
  pattern?: string;
  /** Auto-complete attribute */
  autoComplete?: string;
}

interface NumberFieldProps extends BaseFieldProps {
  type: "number";
  min?: number;
  max?: number;
  step?: number | "any";
  /** Prefix text (e.g., "$") */
  prefix?: string;
  /** Suffix text (e.g., "kg") */
  suffix?: string;
}

interface TextareaFieldProps extends BaseFieldProps {
  type: "textarea";
  /** Number of visible rows */
  rows?: number;
  /** Maximum character length */
  maxLength?: number;
  /** Show character count */
  showCharacterCount?: boolean;
  /** Enable auto-resize */
  autoResize?: boolean;
}

interface SelectFieldProps extends BaseFieldProps {
  type: "select";
  /** Select options */
  options: SelectOption[] | SelectOptionGroup[];
  /** Allow clearing selection */
  clearable?: boolean;
}

interface CheckboxFieldProps extends BaseFieldProps {
  type: "checkbox";
  /** Checkbox label (inline with checkbox) */
  checkboxLabel?: string;
}

interface RadioFieldProps extends BaseFieldProps {
  type: "radio";
  /** Radio options */
  options: SelectOption[];
  /** Layout direction */
  direction?: "horizontal" | "vertical";
}

interface SwitchFieldProps extends BaseFieldProps {
  type: "switch";
  /** Switch label (inline with switch) */
  switchLabel?: string;
}

interface HiddenFieldProps {
  type: "hidden";
  name: string;
  value?: string;
}

interface FileFieldProps extends BaseFieldProps {
  type: "file";
  /** Accepted file types */
  accept?: string;
  /** Allow multiple files */
  multiple?: boolean;
}

export type FormFieldProps =
  | TextFieldProps
  | NumberFieldProps
  | TextareaFieldProps
  | SelectFieldProps
  | CheckboxFieldProps
  | RadioFieldProps
  | SwitchFieldProps
  | HiddenFieldProps
  | FileFieldProps;

// ============================================================================
// Helper Components
// ============================================================================

interface FieldWrapperProps {
  children: ReactNode;
  label?: string;
  required?: boolean;
  description?: string;
  helpText?: string;
  error?: string;
  className?: string;
  hideLabel?: boolean;
  id: string;
}

function FieldWrapper({
  children,
  label,
  required,
  description,
  helpText,
  error,
  className,
  hideLabel,
  id,
}: FieldWrapperProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex items-center gap-1.5">
          <Label
            htmlFor={id}
            className={cn(hideLabel && "sr-only", error && "text-destructive")}
          >
            {label}
            {required && (
              <span className="text-destructive ml-1" aria-hidden="true">
                *
              </span>
            )}
          </Label>
          {helpText && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Help"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="text-sm" side="top">
                {helpText}
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}

      {children}

      {description && !error && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}

      {error && (
        <p
          className="text-destructive flex items-center gap-1.5 text-sm"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

function getNestedError(
  errors: FieldErrors<FieldValues>,
  path: string
): string | undefined {
  const keys = path.split(".");
  let current: any = errors;

  for (const key of keys) {
    if (current == null) return undefined;
    current = current[key];
  }

  const message = current?.message;
  return typeof message === "string" ? message : undefined;
}

function isGroupedOptions(
  options: SelectOption[] | SelectOptionGroup[]
): options is SelectOptionGroup[] {
  return options.length > 0 && "options" in options[0];
}

// ============================================================================
// Main Component
// ============================================================================

export function FormField(props: FormFieldProps) {
  const { name } = props;
  const generatedId = useId();
  const id = `field-${name}-${generatedId}`;
  const tCommon = useTranslations("common");

  const {
    register,
    control,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext();

  const error = getNestedError(errors, name);
  const value = watch(name);

  // Unconditional hook: only meaningful for password text inputs below, but
  // React requires hooks to be called in the same order on every render —
  // the text-input branch is taken conditionally, so the state must live up
  // here at the top level. See react-hooks/rules-of-hooks.
  const [showPassword, setShowPassword] = useState(false);

  // Hidden field - no wrapper.
  // Use `setValue` so we don't render a controlled <input> with both register + value.
  if (props.type === "hidden") {
    if (props.value !== undefined) {
      setValue(name, props.value, { shouldDirty: false, shouldTouch: false });
    }
    return <input type="hidden" {...register(name)} />;
  }

  const {
    label,
    placeholder,
    required,
    disabled,
    readOnly,
    description,
    helpText,
    className,
    inputClassName,
    autoFocus,
    hideLabel,
  } = props as BaseFieldProps;

  // ============================================================================
  // Text Input Fields
  // ============================================================================

  if (
    props.type === "text" ||
    props.type === "email" ||
    props.type === "password" ||
    props.type === "tel" ||
    props.type === "url" ||
    props.type === "date" ||
    props.type === "time" ||
    props.type === "datetime-local" ||
    props.type === "color" ||
    props.type === undefined
  ) {
    const {
      type = "text",
      startIcon,
      endIcon,
      prefix,
      suffix,
      maxLength,
      showCharacterCount,
      pattern,
      autoComplete,
    } = props as TextFieldProps;

    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    const charCount = typeof value === "string" ? value.length : 0;
    const hasAdornments = Boolean(
      startIcon || endIcon || prefix || suffix || isPassword
    );

    const inputElement = (
      <Input
        id={id}
        type={inputType}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        autoFocus={autoFocus}
        maxLength={maxLength}
        pattern={pattern}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        className={cn(
          error && "border-destructive focus-visible:ring-destructive",
          hasAdornments && "peer",
          startIcon && "pl-10",
          (endIcon || isPassword) && "pr-10",
          prefix && "pl-8",
          suffix && "pr-12",
          inputClassName
        )}
        {...register(name, { valueAsNumber: false })}
      />
    );

    return (
      <FieldWrapper
        label={label}
        required={required}
        description={description}
        helpText={helpText}
        error={error}
        className={className}
        hideLabel={hideLabel}
        id={id}
      >
        {hasAdornments ? (
          <div className="relative">
            {startIcon && (
              <div className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
                {startIcon}
              </div>
            )}
            {prefix && (
              <div className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                {prefix}
              </div>
            )}
            {inputElement}
            {suffix && (
              <div className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                {suffix}
              </div>
            )}
            {endIcon && !isPassword && (
              <div className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                {endIcon}
              </div>
            )}
            {isPassword && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-0 right-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="text-muted-foreground h-4 w-4" />
                ) : (
                  <Eye className="text-muted-foreground h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        ) : (
          inputElement
        )}

        {showCharacterCount && maxLength && (
          <p className="text-muted-foreground text-right text-xs">
            {charCount}/{maxLength}
          </p>
        )}
      </FieldWrapper>
    );
  }

  // ============================================================================
  // Number Input
  // ============================================================================

  if (props.type === "number") {
    const { min, max, step, prefix, suffix } = props as NumberFieldProps;
    const hasAdornments = Boolean(prefix || suffix);

    const inputElement = (
      <Input
        id={id}
        type="number"
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        autoFocus={autoFocus}
        min={min}
        max={max}
        step={step}
        aria-invalid={!!error}
        className={cn(
          error && "border-destructive focus-visible:ring-destructive",
          prefix && "pl-8",
          suffix && "pr-12",
          inputClassName
        )}
        {...register(name, { valueAsNumber: true })}
      />
    );

    return (
      <FieldWrapper
        label={label}
        required={required}
        description={description}
        helpText={helpText}
        error={error}
        className={className}
        hideLabel={hideLabel}
        id={id}
      >
        {hasAdornments ? (
          <div className="relative">
            {prefix && (
              <div className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                {prefix}
              </div>
            )}
            {inputElement}
            {suffix && (
              <div className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                {suffix}
              </div>
            )}
          </div>
        ) : (
          inputElement
        )}
      </FieldWrapper>
    );
  }

  // ============================================================================
  // Textarea
  // ============================================================================

  if (props.type === "textarea") {
    const {
      rows = 4,
      maxLength,
      showCharacterCount,
      autoResize,
    } = props as TextareaFieldProps;

    const charCount = typeof value === "string" ? value.length : 0;

    return (
      <FieldWrapper
        label={label}
        required={required}
        description={description}
        helpText={helpText}
        error={error}
        className={className}
        hideLabel={hideLabel}
        id={id}
      >
        <Textarea
          id={id}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          autoFocus={autoFocus}
          rows={rows}
          maxLength={maxLength}
          aria-invalid={!!error}
          className={cn(
            error && "border-destructive focus-visible:ring-destructive",
            autoResize && "resize-none overflow-hidden",
            inputClassName
          )}
          {...register(name)}
          onInput={
            autoResize
              ? (e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${target.scrollHeight}px`;
                }
              : undefined
          }
        />

        {showCharacterCount && maxLength && (
          <p
            className={cn(
              "text-right text-xs",
              charCount > maxLength * 0.9
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          >
            {charCount}/{maxLength}
          </p>
        )}
      </FieldWrapper>
    );
  }

  // ============================================================================
  // Select
  // ============================================================================

  if (props.type === "select") {
    const { options, clearable } = props as SelectFieldProps;

    return (
      <FieldWrapper
        label={label}
        required={required}
        description={description}
        helpText={helpText}
        error={error}
        className={className}
        hideLabel={hideLabel}
        id={id}
      >
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? ""}
              onValueChange={(val) => {
                field.onChange(val === "__clear__" ? "" : val);
              }}
              disabled={disabled}
            >
              <SelectTrigger
                id={id}
                className={cn(
                  error && "border-destructive focus:ring-destructive",
                  inputClassName
                )}
                aria-invalid={!!error}
              >
                <SelectValue
                  placeholder={placeholder || tCommon("selectAnOption")}
                />
              </SelectTrigger>
              <SelectContent>
                {clearable && field.value && (
                  <SelectItem
                    value="__clear__"
                    className="text-muted-foreground"
                  >
                    {tCommon("clearSelection")}
                  </SelectItem>
                )}

                {isGroupedOptions(options)
                  ? options.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel>{group.label}</SelectLabel>
                        {group.options.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            disabled={option.disabled}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))
                  : options.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          )}
        />
      </FieldWrapper>
    );
  }

  // ============================================================================
  // Checkbox
  // ============================================================================

  if (props.type === "checkbox") {
    const { checkboxLabel } = props as CheckboxFieldProps;

    return (
      <FieldWrapper
        label={label}
        required={required}
        description={description}
        helpText={helpText}
        error={error}
        className={className}
        hideLabel={hideLabel || Boolean(checkboxLabel)}
        id={id}
      >
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <div className="flex items-start gap-3">
              <Checkbox
                id={id}
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
                disabled={disabled}
                aria-invalid={!!error}
                className={cn(error && "border-destructive")}
              />
              {checkboxLabel && (
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor={id}
                    className={cn(
                      "cursor-pointer font-normal",
                      disabled && "cursor-not-allowed opacity-70"
                    )}
                  >
                    {checkboxLabel}
                    {required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                </div>
              )}
            </div>
          )}
        />
      </FieldWrapper>
    );
  }

  // ============================================================================
  // Radio Group
  // ============================================================================

  if (props.type === "radio") {
    const { options, direction = "vertical" } = props as RadioFieldProps;

    return (
      <FieldWrapper
        label={label}
        required={required}
        description={description}
        helpText={helpText}
        error={error}
        className={className}
        hideLabel={hideLabel}
        id={id}
      >
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <RadioGroup
              value={field.value ?? ""}
              onValueChange={field.onChange}
              disabled={disabled}
              className={cn(
                direction === "horizontal"
                  ? "flex flex-wrap gap-4"
                  : "flex flex-col gap-2"
              )}
              aria-invalid={!!error}
            >
              {options.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <RadioGroupItem
                    value={option.value}
                    id={`${id}-${option.value}`}
                    disabled={disabled || option.disabled}
                    className={cn(error && "border-destructive")}
                  />
                  <Label
                    htmlFor={`${id}-${option.value}`}
                    className={cn(
                      "cursor-pointer font-normal",
                      (disabled || option.disabled) &&
                        "cursor-not-allowed opacity-70"
                    )}
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        />
      </FieldWrapper>
    );
  }

  // ============================================================================
  // Switch
  // ============================================================================

  if (props.type === "switch") {
    const { switchLabel } = props as SwitchFieldProps;

    return (
      <FieldWrapper
        label={label}
        required={required}
        description={description}
        helpText={helpText}
        error={error}
        className={className}
        hideLabel={hideLabel || Boolean(switchLabel)}
        id={id}
      >
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <Switch
                id={id}
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
                disabled={disabled}
                aria-invalid={!!error}
              />
              {switchLabel && (
                <Label
                  htmlFor={id}
                  className={cn(
                    "cursor-pointer font-normal",
                    disabled && "cursor-not-allowed opacity-70"
                  )}
                >
                  {switchLabel}
                </Label>
              )}
            </div>
          )}
        />
      </FieldWrapper>
    );
  }

  // ============================================================================
  // File Input
  // ============================================================================

  if (props.type === "file") {
    const { accept, multiple } = props as FileFieldProps;

    return (
      <FieldWrapper
        label={label}
        required={required}
        description={description}
        helpText={helpText}
        error={error}
        className={className}
        hideLabel={hideLabel}
        id={id}
      >
        <Input
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={!!error}
          className={cn(
            "cursor-pointer file:cursor-pointer file:border-0 file:bg-transparent file:text-sm file:font-medium",
            error && "border-destructive focus-visible:ring-destructive",
            inputClassName
          )}
          {...register(name)}
        />
      </FieldWrapper>
    );
  }

  return null;
}

export default FormField;
