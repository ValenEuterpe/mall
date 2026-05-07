"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PasswordConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: (password: string) => Promise<void>;
  destructive?: boolean;
}

export function PasswordConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = false,
}: PasswordConfirmDialogProps): React.ReactElement {
  const t = useTranslations("mallOwner.sellers");

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Clear state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setPassword("");
      setError("");
      setLoading(false);
    }
  }, [open]);

  const handleConfirm = useCallback(async () => {
    if (!password) return;

    setLoading(true);
    setError("");

    try {
      const res = await apiClient.post<{ verified: boolean }>(
        "/auth/verify-password",
        { password }
      );

      if (!res.success) {
        setError(t("incorrectPassword"));
        setLoading(false);
        return;
      }

      await onConfirm(password);
      onOpenChange(false);
    } catch {
      setError(t("incorrectPassword"));
    } finally {
      setLoading(false);
    }
  }, [password, onConfirm, onOpenChange, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t("passwordLabel")}</Label>
            <Input
              id="confirm-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder={t("passwordPlaceholder")}
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === "Enter" && password) {
                  handleConfirm();
                }
              }}
            />
            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("cancel")}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={loading || !password}
          >
            {loading ? t("confirming") : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
