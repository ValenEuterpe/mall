"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Save, User, Mail, Calendar, Shield } from "lucide-react";

import { apiClient } from "@/lib/api-client/client";
import { toast } from "@/lib/utils/toast";
import { useAuth } from "@/hooks/use-auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface SellerProfile {
  id: string;
  businessName: string | null;
  contactPerson: string | null;
  phone: string | null;
  description: string | null;
  email: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  socialLinks: {
    instagram?: string;
    telegram?: string;
    whatsapp?: string;
    email?: string;
  } | null;
  shops: Array<{
    id: string;
    code: string;
    name: string | null;
  }>;
  isVerified: boolean;
  createdAt: string;
}

interface FormData {
  businessName: string;
  contactPerson: string;
  phone: string;
  description: string;
  instagram: string;
  telegram: string;
  whatsapp: string;
}

function UserSettingsView(): React.ReactElement {
  const t = useTranslations("account.settings");
  const { user } = useAuth();

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("userTitle")}</h1>
        <p className="text-muted-foreground text-sm">{t("userSubtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t("personalInfo")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("firstName")}</Label>
            <p className="text-sm font-medium">{user?.firstName ?? "—"}</p>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>{t("lastName")}</Label>
            <p className="text-sm font-medium">{user?.lastName ?? "—"}</p>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {t("email")}
            </Label>
            <p className="text-sm font-medium">{user?.email ?? "—"}</p>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              {t("role")}
            </Label>
            <div>
              <Badge variant="secondary">{t("roleUser")}</Badge>
            </div>
          </div>
          {formattedDate && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {t("memberSince")}
                </Label>
                <p className="text-sm font-medium">{formattedDate}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-center text-xs">
        {t("editComingSoon")}
      </p>
    </div>
  );
}

export default function AccountSettingsPage(): React.ReactElement {
  const t = useTranslations("account.settings");
  const { user } = useAuth();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    businessName: "",
    contactPerson: "",
    phone: "",
    description: "",
    instagram: "",
    telegram: "",
    whatsapp: "",
  });

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<SellerProfile>("/sellers/profile");
      if (response.success && response.data) {
        const p = response.data;
        setProfile(p);
        setFormData({
          businessName: p.businessName ?? "",
          contactPerson: p.contactPerson ?? "",
          phone: p.phone ?? "",
          description: p.description ?? "",
          instagram: p.socialLinks?.instagram ?? "",
          telegram: p.socialLinks?.telegram ?? "",
          whatsapp: p.socialLinks?.whatsapp ?? "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      toast.error(t("loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (user?.role === "SELLER") {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [user, fetchProfile]);

  const handleChange = (field: keyof FormData, value: string): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        businessName: formData.businessName || undefined,
        contactPerson: formData.contactPerson || undefined,
        phone: formData.phone || undefined,
        description: formData.description || undefined,
        socialLinks: {
          instagram: formData.instagram || undefined,
          telegram: formData.telegram || undefined,
          whatsapp: formData.whatsapp || undefined,
        },
      };
      await apiClient.patch("/sellers/profile", payload);
      toast.success(t("saveSuccess"));
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error(t("saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (user?.role !== "SELLER") {
    return <UserSettingsView />;
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("businessInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">{t("businessName")}</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => handleChange("businessName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPerson">{t("contactPerson")}</Label>
              <Input
                id="contactPerson"
                value={formData.contactPerson}
                onChange={(e) => handleChange("contactPerson", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t("description")}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("socialLinks")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={formData.instagram}
                onChange={(e) => handleChange("instagram", e.target.value)}
                placeholder="@username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telegram">Telegram</Label>
              <Input
                id="telegram"
                value={formData.telegram}
                onChange={(e) => handleChange("telegram", e.target.value)}
                placeholder="@username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => handleChange("whatsapp", e.target.value)}
                placeholder="+374..."
              />
            </div>
          </CardContent>
        </Card>

        {profile && (
          <Card>
            <CardHeader>
              <CardTitle>{t("accountInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("email")}</span>
                <span>{profile.email}</span>
              </div>
              {profile.shops.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("shop")}</span>
                  <span>{profile.shops[0].name || profile.shops[0].code}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Button type="submit" disabled={isSaving} className="w-full">
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {t("save")}
        </Button>
      </form>
    </div>
  );
}
