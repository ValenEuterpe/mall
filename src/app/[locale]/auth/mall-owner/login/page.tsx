"use client";

import React, { useCallback, useState } from "react";

import { useTranslations } from "next-intl";

import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function MallOwnerLoginPage(): React.ReactElement {
  const t = useTranslations("mallOwnerAuth");
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        await apiClient.post("/auth/mall-owner/request-link", {
          email,
        });
        // Always generic success (anti-enumeration)
        toast.success(t("requestLink.success"));
      } catch (err) {
        toast.apiError(err, t("requestLink.error"));
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, toast, t]
  );

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="mx-auto max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("requestLink.emailLabel")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("requestLink.emailPlaceholder")}
              autoComplete="email"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting
              ? t("requestLink.submitting")
              : t("requestLink.submit")}
          </Button>
        </form>

        <div className="bg-muted/30 text-muted-foreground rounded-lg border p-4 text-sm">
          {t("requestLink.note")}
        </div>
      </div>
    </div>
  );
}
