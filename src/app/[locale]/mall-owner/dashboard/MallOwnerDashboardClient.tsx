"use client";

import React, { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "@/i18n/routing";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { MallOwnerSellersPanel } from "@/components/mall-owner/MallOwnerSellersPanel";
import { MallOwnerStructurePanel } from "@/components/mall-owner/MallOwnerStructurePanel";
import { MallOwnerCategoriesPanel } from "@/components/mall-owner/MallOwnerCategoriesPanel";
import { MallOwnerMapsPanel } from "@/components/mall-owner/MallOwnerMapsPanel";
import { MallOwnerTagsPanel } from "@/components/mall-owner/MallOwnerTagsPanel";
import { MallOwnerAboutPanel } from "@/components/mall-owner/MallOwnerAboutPanel";

type VerifyState = "idle" | "submitting";

function MagicLinkVerifyCard({ token }: { token: string }): React.ReactElement {
  const t = useTranslations("mallOwnerAuth");
  const toast = useToast();
  const router = useRouter();
  const auth = useAuth();

  const [password, setPassword] = useState("");
  const [state, setState] = useState<VerifyState>("idle");

  const onVerify = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setState("submitting");
      try {
        await apiClient.post("/auth/mall-owner/verify-link", {
          token,
          password,
        });

        await auth.refreshUser();

        toast.success(t("verify.success"));
        router.replace("/mall-owner/dashboard");
      } catch (err) {
        toast.apiError(err, t("verify.error"));
      } finally {
        setState("idle");
      }
    },
    [password, router, t, toast, token, auth]
  );

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="mx-auto max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("verify.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("verify.subtitle")}
          </p>
        </div>

        <form
          onSubmit={onVerify}
          className="bg-card space-y-4 rounded-xl border p-6 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="password">{t("verify.passwordLabel")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={state === "submitting"}
          >
            {state === "submitting"
              ? t("verify.submitting")
              : t("verify.submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function MallOwnerDashboardClient(): React.ReactElement {
  const t = useTranslations("mallOwner");
  const auth = useAuth();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");

  if (token) {
    return <MagicLinkVerifyCard token={token} />;
  }

  if (auth.isInitialized && auth.user && auth.user.role !== "MALL_OWNER") {
    return (
      <div className="text-muted-foreground py-10 text-center text-sm">
        {t("unauthorized")}
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>
<Tabs defaultValue="sellers">
  <TabsList className="grid w-full grid-cols-6">
    <TabsTrigger value="sellers">{t("tabs.sellers")}</TabsTrigger>
    <TabsTrigger value="structure">{t("tabs.structure")}</TabsTrigger>
    <TabsTrigger value="categories">{t("tabs.categories")}</TabsTrigger>
    <TabsTrigger value="tags">{t("tabs.tags")}</TabsTrigger>
    <TabsTrigger value="maps">{t("tabs.maps")}</TabsTrigger>
    <TabsTrigger value="about">{t("tabs.about")}</TabsTrigger>
  </TabsList>

  <TabsContent value="sellers" className="pt-4">
    <MallOwnerSellersPanel />
  </TabsContent>

  <TabsContent value="structure" className="pt-4">
    <MallOwnerStructurePanel />
  </TabsContent>

  <TabsContent value="categories" className="pt-4">
    <MallOwnerCategoriesPanel />
  </TabsContent>

  <TabsContent value="tags" className="pt-4">
    <MallOwnerTagsPanel />
  </TabsContent>

  <TabsContent value="maps" className="pt-4">
...
          <MallOwnerMapsPanel />
        </TabsContent>

        <TabsContent value="about" className="pt-4">
          <MallOwnerAboutPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
