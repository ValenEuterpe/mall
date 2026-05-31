"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/utils/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Building2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  Store,
  User,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { formatShopLocation } from "@/lib/utils/format-shop-location";

interface Shop {
  id: string;
  code: string;
  name: string | null;
  floor: number | null;
  building: string | null;
  venue: string | null;
}

interface SellerProfile {
  id: string;
  businessName: string | null;
  contactPerson: string | null;
  phone: string | null;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  socialLinks: {
    instagram?: string;
    telegram?: string;
    whatsapp?: string;
    email?: string;
  } | null;
  email: string;
  shops: Shop[];
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

interface FormData {
  businessName: string;
  contactPerson: string;
  phone: string;
  description: string;
}

export default function SellerProfilePage() {
  const t = useTranslations("seller.profile");
  const tCommon = useTranslations("common");
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    businessName: "",
    contactPerson: "",
    phone: "",
    description: "",
  });
  const [initialFormData, setInitialFormData] = useState<FormData>({
    businessName: "",
    contactPerson: "",
    phone: "",
    description: "",
  });

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiClient.get<SellerProfile>("/sellers/profile");
        if (response.success && response.data) {
          setProfile(response.data);
          const data = {
            businessName: response.data.businessName || "",
            contactPerson: response.data.contactPerson || "",
            phone: response.data.phone || "",
            description: response.data.description || "",
          };
          setFormData(data);
          setInitialFormData(data);
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        toast.error(tCommon("errorTitle"));
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchProfile();
    }
  }, [authLoading, user, tCommon]);

  // Check if form has changes
  const hasChanges =
    JSON.stringify(formData) !== JSON.stringify(initialFormData);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasChanges) {
      toast.info(t("noChanges"));
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.patch("/sellers/profile", formData);
      setInitialFormData(formData);
      toast.success(t("saveSuccess"));
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error(t("saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle input changes
  const handleChange =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Skeleton className="mb-2 h-8 w-48" />
        <Skeleton className="mb-8 h-4 w-64" />
        <div className="grid gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/seller/dashboard">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tCommon("back")}
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Shop Information (Read-only) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                {t("shopInfo")}
              </CardTitle>
              {profile?.shops && profile.shops.length > 0 && (
                <Link href="/seller/shop/edit">
                  <Button variant="outline" size="sm">
                    <Pencil className="mr-2 h-4 w-4" />
                    {t("editShop")}
                  </Button>
                </Link>
              )}
            </div>
            <CardDescription>
              {!profile?.shops.length
                ? t("noShopsAssigned")
                : t("shopsAssignedCount", { count: profile.shops.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile?.shops && profile.shops.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {profile.shops.map((shop) => (
                  <div
                    key={shop.id}
                    className="bg-muted/30 flex items-start gap-3 rounded-lg border p-4"
                  >
                    <div className="bg-primary/10 flex-shrink-0 rounded-md p-2">
                      <Building2 className="text-primary h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {formatShopLocation(shop.code, tCommon)}
                        </span>
                        {shop.name && (
                          <Badge variant="secondary" className="text-xs">
                            {shop.name}
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground mt-1 flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3" />
                        <span>
                          {[
                            shop.venue,
                            shop.building,
                            shop.floor !== null &&
                              t("floorLabel", { floor: shop.floor }),
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground py-8 text-center">
                <Store className="mx-auto mb-3 h-12 w-12 opacity-30" />
                <p>{t("noShopsAssigned")}</p>
                <p className="mt-1 text-sm">{t("contactMallOwner")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Information (Read-only email, editable phone) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("contactInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t("email")}
              </Label>
              <Input
                type="email"
                value={profile?.email || ""}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Business Name */}
            <div className="space-y-2">
              <Label htmlFor="businessName">{t("businessName")}</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={handleChange("businessName")}
                placeholder={t("businessNamePlaceholder")}
                maxLength={200}
              />
            </div>

            {/* Contact Person */}
            <div className="space-y-2">
              <Label htmlFor="contactPerson">{t("contactPerson")}</Label>
              <Input
                id="contactPerson"
                value={formData.contactPerson}
                onChange={handleChange("contactPerson")}
                placeholder={t("contactPersonPlaceholder")}
                maxLength={100}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {t("phoneOptional")}
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange("phone")}
                placeholder={t("phonePlaceholder")}
                maxLength={20}
              />
            </div>
          </CardContent>
        </Card>

        {/* Shop Description */}
        <Card>
          <CardHeader>
            <CardTitle>{t("description")}</CardTitle>
            <CardDescription>{t("descriptionHelp")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.description}
              onChange={handleChange("description")}
              placeholder={t("descriptionPlaceholder")}
              rows={5}
              maxLength={1000}
              className="resize-none"
            />
            <p className="text-muted-foreground mt-2 text-right text-xs">
              {formData.description.length}/1000
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <>
                <span className="mr-2 animate-spin">⏳</span>
                {t("saving")}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t("save")}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
