"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  FileX,
  FolderOpen,
  Inbox,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Users,
} from "lucide-react";

export type EmptyStateVariant =
  | "default"
  | "search"
  | "products"
  | "users"
  | "cart"
  | "files"
  | "inbox"
  | "error"
  | "folder";

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost";
  icon?: React.ReactNode;
}

export interface EmptyStateProps {
  variant?: EmptyStateVariant;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  children?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
  compact?: boolean;
}

const variantIcons: Record<EmptyStateVariant, React.ReactNode> = {
  default: <Inbox className="h-12 w-12" />,
  search: <Search className="h-12 w-12" />,
  products: <Package className="h-12 w-12" />,
  users: <Users className="h-12 w-12" />,
  cart: <ShoppingCart className="h-12 w-12" />,
  files: <FileX className="h-12 w-12" />,
  inbox: <Inbox className="h-12 w-12" />,
  error: <AlertCircle className="h-12 w-12" />,
  folder: <FolderOpen className="h-12 w-12" />,
};

const variantColors: Record<EmptyStateVariant, string> = {
  default: "text-muted-foreground",
  search: "text-muted-foreground",
  products: "text-muted-foreground",
  users: "text-muted-foreground",
  cart: "text-muted-foreground",
  files: "text-muted-foreground",
  inbox: "text-muted-foreground",
  error: "text-destructive/70",
  folder: "text-muted-foreground",
};

export function EmptyState({
  variant = "default",
  icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  size = "md",
  className,
  compact = false,
}: EmptyStateProps) {
  const displayIcon = icon ?? variantIcons[variant];
  const iconColor = variantColors[variant];

  const sizeStyles = {
    sm: {
      container: compact ? "py-6" : "py-8",
      icon: "h-8 w-8",
      title: "text-base",
      description: "text-sm",
    },
    md: {
      container: compact ? "py-8" : "py-12",
      icon: "h-12 w-12",
      title: "text-lg",
      description: "text-sm",
    },
    lg: {
      container: compact ? "py-12" : "py-16",
      icon: "h-16 w-16",
      title: "text-xl",
      description: "text-base",
    },
  } as const;

  const styles = sizeStyles[size];

  if (compact) {
    return (
      <div className={cn("flex items-center gap-4 rounded-lg border border-dashed p-4", className)}>
        <div className={cn(iconColor, "flex-shrink-0")}>{displayIcon}</div>
        <div className="min-w-0 flex-1">
          <h3 className={cn("font-medium", styles.title)}>{title}</h3>
          {description && (
            <p className={cn("mt-1 truncate text-muted-foreground", styles.description)}>{description}</p>
          )}
        </div>
        {action && (
          <Button variant={action.variant ?? "default"} size="sm" onClick={action.onClick}>
            {action.icon}
            {action.label}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center text-center", styles.container, className)}>
      <div className={cn("mb-4 rounded-full bg-muted p-4", iconColor, size === "lg" && "p-6")}>
        <div className={styles.icon}>{displayIcon}</div>
      </div>

      <h3 className={cn("font-semibold", styles.title)}>{title}</h3>

      {description && (
        <p className={cn("mt-2 max-w-md text-muted-foreground", styles.description)}>{description}</p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-6 flex items-center gap-3">
          {action && (
            <Button variant={action.variant ?? "default"} onClick={action.onClick}>
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant={secondaryAction.variant ?? "outline"} onClick={secondaryAction.onClick}>
              {secondaryAction.icon && <span className="mr-2">{secondaryAction.icon}</span>}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}

      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}

interface PresetEmptyStateProps {
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

export function NoSearchResults({ onAction, actionLabel = "Clear search", className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      variant="search"
      title="No results found"
      description="Try adjusting your search or filter to find what you're looking for."
      action={
        onAction
          ? {
              label: actionLabel,
              onClick: onAction,
              variant: "outline",
              icon: <RefreshCw className="mr-2 h-4 w-4" />,
            }
          : undefined
      }
      className={className}
    />
  );
}

export function NoProducts({ onAction, actionLabel = "Add Product", className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      variant="products"
      title="No products yet"
      description="Get started by adding your first product to the catalog."
      action={
        onAction
          ? {
              label: actionLabel,
              onClick: onAction,
              icon: <Plus className="mr-2 h-4 w-4" />,
            }
          : undefined
      }
      className={className}
    />
  );
}

export function EmptyCart({ onAction, actionLabel = "Browse Products", className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      variant="cart"
      title="Your cart is empty"
      description="Looks like you haven't added any items to your cart yet."
      action={onAction ? { label: actionLabel, onClick: onAction } : undefined}
      className={className}
    />
  );
}

export function NoUsers({ onAction, actionLabel = "Invite User", className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      variant="users"
      title="No users found"
      description="Invite team members to collaborate on your project."
      action={
        onAction
          ? {
              label: actionLabel,
              onClick: onAction,
              icon: <Plus className="mr-2 h-4 w-4" />,
            }
          : undefined
      }
      className={className}
    />
  );
}

export function NoFiles({ onAction, actionLabel = "Upload File", className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      variant="files"
      title="No files uploaded"
      description="Upload files to get started."
      action={
        onAction
          ? {
              label: actionLabel,
              onClick: onAction,
              icon: <Plus className="mr-2 h-4 w-4" />,
            }
          : undefined
      }
      className={className}
    />
  );
}

export function ErrorState({
  onAction,
  actionLabel = "Try Again",
  title = "Something went wrong",
  description = "An error occurred while loading this content.",
  className,
}: PresetEmptyStateProps & { title?: string; description?: string }) {
  return (
    <EmptyState
      variant="error"
      title={title}
      description={description}
      action={
        onAction
          ? {
              label: actionLabel,
              onClick: onAction,
              variant: "outline",
              icon: <RefreshCw className="mr-2 h-4 w-4" />,
            }
          : undefined
      }
      className={className}
    />
  );
}

export default EmptyState;
