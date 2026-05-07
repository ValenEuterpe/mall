"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Save, Upload } from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/utils/toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SocialLinks {
  instagram?: string;
  facebook?: string;
  telegram?: string;
}

interface AboutData {
  id: string;
  name: string;
  address: string | null;
  description_en: string | null;
  description_ru: string | null;
  description_am: string | null;
  workingHours: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  logoUrl: string | null;
  socialLinks: SocialLinks | null;
  policies_en: string | null;
  policies_ru: string | null;
  policies_am: string | null;
}

interface FormState {
  description_en: string;
  description_ru: string;
  description_am: string;
  workingHours: string;
  contactPhone: string;
  contactEmail: string;
  logoUrl: string;
  instagram: string;
  facebook: string;
  telegram: string;
  policies_en: string;
  policies_ru: string;
  policies_am: string;
}

function dataToForm(data: AboutData | null): FormState {
  const social = (data?.socialLinks as SocialLinks) || {};
  return {
    description_en: data?.description_en || "",
    description_ru: data?.description_ru || "",
    description_am: data?.description_am || "",
    workingHours: data?.workingHours || "",
    contactPhone: data?.contactPhone || "",
    contactEmail: data?.contactEmail || "",
    logoUrl: data?.logoUrl || "",
    instagram: social.instagram || "",
    facebook: social.facebook || "",
    telegram: social.telegram || "",
    policies_en: data?.policies_en || "",
    policies_ru: data?.policies_ru || "",
    policies_am: data?.policies_am || "",
  };
}

export function MallOwnerAboutPanel(): React.ReactElement {
  const t = useTranslations("mallOwner.about");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState<FormState>(dataToForm(null));

  const fetchAbout = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<AboutData>("/mall/about");
      if (response.success && response.data) {
        setForm(dataToForm(response.data as AboutData));
      }
    } catch (err) {
      console.error("Failed to fetch about data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAbout();
  }, [fetchAbout]);

  const handleChange = useCallback(
    (field: keyof FormState, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleLogoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
        const response = await apiClient.upload("/upload", file);
        if (response.success && response.data) {
          const data = response.data as { url: string };
          setForm((prev) => ({ ...prev, logoUrl: data.url }));
          toast.success(t("logoUploaded"));
        }
      } catch (err) {
        console.error("Failed to upload logo:", err);
        toast.error(t("logoUploadError"));
      } finally {
        setIsUploading(false);
      }
    },
    [t]
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const payload = {
        description_en: form.description_en || null,
        description_ru: form.description_ru || null,
        description_am: form.description_am || null,
        workingHours: form.workingHours || null,
        contactPhone: form.contactPhone || null,
        contactEmail: form.contactEmail || null,
        logoUrl: form.logoUrl || null,
        socialLinks: {
          instagram: form.instagram || "",
          facebook: form.facebook || "",
          telegram: form.telegram || "",
        },
        policies_en: form.policies_en || null,
        policies_ru: form.policies_ru || null,
        policies_am: form.policies_am || null,
      };

      const response = await apiClient.put("/mall/about", payload);
      if (response.success) {
        toast.success(t("saved"));
      }
    } catch (err) {
      console.error("Failed to save about data:", err);
      toast.error(t("saveError"));
    } finally {
      setIsSaving(false);
    }
  }, [form, t]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>{t("description")}</CardTitle>
          <CardDescription>{t("descriptionHelp")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="en">
            <TabsList>
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="ru">Русский</TabsTrigger>
              <TabsTrigger value="am">Հայերեն</TabsTrigger>
            </TabsList>
            <TabsContent value="en" className="pt-3">
              <Textarea
                value={form.description_en}
                onChange={(e) => handleChange("description_en", e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                rows={5}
              />
            </TabsContent>
            <TabsContent value="ru" className="pt-3">
              <Textarea
                value={form.description_ru}
                onChange={(e) => handleChange("description_ru", e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                rows={5}
              />
            </TabsContent>
            <TabsContent value="am" className="pt-3">
              <Textarea
                value={form.description_am}
                onChange={(e) => handleChange("description_am", e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                rows={5}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Contact & Hours */}
      <Card>
        <CardHeader>
          <CardTitle>{t("contactAndHours")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("contactPhone")}</Label>
              <Input
                value={form.contactPhone}
                onChange={(e) => handleChange("contactPhone", e.target.value)}
                placeholder="+374 XX XXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("contactEmail")}</Label>
              <Input
                type="email"
                value={form.contactEmail}
                onChange={(e) => handleChange("contactEmail", e.target.value)}
                placeholder="info@mall.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("workingHours")}</Label>
            <Textarea
              value={form.workingHours}
              onChange={(e) => handleChange("workingHours", e.target.value)}
              placeholder={t("workingHoursPlaceholder")}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle>{t("logo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.logoUrl && (
            <div className="flex items-center gap-4">
              <img
                src={form.logoUrl}
                alt="Mall logo"
                className="h-16 w-16 rounded-lg border object-cover"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleChange("logoUrl", "")}
              >
                {t("removeLogo")}
              </Button>
            </div>
          )}
          <div>
            <Label
              htmlFor="logo-upload"
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isUploading ? t("uploading") : t("uploadLogo")}
            </Label>
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
              disabled={isUploading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader>
          <CardTitle>{t("socialLinks")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("instagram")}</Label>
            <Input
              value={form.instagram}
              onChange={(e) => handleChange("instagram", e.target.value)}
              placeholder="https://instagram.com/..."
            />
          </div>
          <div className="space-y-2">
            <Label>{t("facebook")}</Label>
            <Input
              value={form.facebook}
              onChange={(e) => handleChange("facebook", e.target.value)}
              placeholder="https://facebook.com/..."
            />
          </div>
          <div className="space-y-2">
            <Label>{t("telegram")}</Label>
            <Input
              value={form.telegram}
              onChange={(e) => handleChange("telegram", e.target.value)}
              placeholder="https://t.me/..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Policies */}
      <Card>
        <CardHeader>
          <CardTitle>{t("policies")}</CardTitle>
          <CardDescription>{t("policiesHelp")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="en">
            <TabsList>
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="ru">Русский</TabsTrigger>
              <TabsTrigger value="am">Հայերեն</TabsTrigger>
            </TabsList>
            <TabsContent value="en" className="pt-3">
              <Textarea
                value={form.policies_en}
                onChange={(e) => handleChange("policies_en", e.target.value)}
                placeholder={t("policiesPlaceholder")}
                rows={5}
              />
            </TabsContent>
            <TabsContent value="ru" className="pt-3">
              <Textarea
                value={form.policies_ru}
                onChange={(e) => handleChange("policies_ru", e.target.value)}
                placeholder={t("policiesPlaceholder")}
                rows={5}
              />
            </TabsContent>
            <TabsContent value="am" className="pt-3">
              <Textarea
                value={form.policies_am}
                onChange={(e) => handleChange("policies_am", e.target.value)}
                placeholder={t("policiesPlaceholder")}
                rows={5}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
