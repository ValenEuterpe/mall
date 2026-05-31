"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useRequireRole } from "@/hooks/use-auth";
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
import { ArrowLeft, Save, ImageIcon, Loader2, X } from "lucide-react";
import { Link } from "@/i18n/routing";

// Social platform config
const SOCIAL_PLATFORMS = [
  {
    type: "TELEGRAM",
    label: "Telegram",
    icon: "/icons/social/Telegram.svg",
    placeholder: "https://t.me/yourshop",
  },
  {
    type: "INSTAGRAM",
    label: "Instagram",
    icon: "/icons/social/Instagram.svg",
    placeholder: "https://instagram.com/yourshop",
  },
  {
    type: "FACEBOOK",
    label: "Facebook",
    icon: "/icons/social/Facebook.svg",
    placeholder: "https://facebook.com/yourshop",
  },
  {
    type: "VK",
    label: "VK",
    icon: "/icons/social/VK.svg",
    placeholder: "https://vk.com/yourshop",
  },
  {
    type: "WHATSAPP",
    label: "WhatsApp",
    icon: "/icons/social/WhatsApp.svg",
    placeholder: "+1234567890",
  },
  {
    type: "X_TWITTER",
    label: "X / Twitter",
    icon: "/icons/social/X_Twitter.svg",
    placeholder: "https://x.com/yourshop",
  },
  {
    type: "TIKTOK",
    label: "TikTok",
    icon: "/icons/social/TikTok.svg",
    placeholder: "https://tiktok.com/@yourshop",
  },
  {
    type: "YOUTUBE",
    label: "YouTube",
    icon: "/icons/social/YouTube.svg",
    placeholder: "https://youtube.com/@yourshop",
  },
  {
    type: "SNAPCHAT",
    label: "Snapchat",
    icon: "/icons/social/Snapchat.svg",
    placeholder: "https://snapchat.com/add/yourshop",
  },
] as const;

type ContactEntry = { type: string; value: string; label?: string };

interface ShopData {
  id: string;
  fullCode: string;
  shopName: string | null;
  description: string | null;
  imageUrl: string | null;
  venue: string;
  building: string | null;
  floor: string | null;
  shopNumber: string;
  contacts: ContactEntry[];
}

export default function SellerShopEditPage(): React.ReactElement {
  useRequireRole("SELLER", "/unauthorized");
  const t = useTranslations("seller.shopEdit");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [shop, setShop] = useState<ShopData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form state
  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [socials, setSocials] = useState<Record<string, string>>({});

  // Track initial state for dirty check
  const [initial, setInitial] = useState<string>("");

  const currentState = JSON.stringify({
    shopName,
    description,
    imageUrl,
    socials,
  });
  const hasChanges = initial !== "" && currentState !== initial;

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get<ShopData>("/sellers/shop");
        if (res.success && res.data) {
          const s = res.data;
          setShop(s);
          setShopName(s.shopName || "");
          setDescription(s.description || "");
          setImageUrl(s.imageUrl);

          const socialMap: Record<string, string> = {};
          for (const c of s.contacts) {
            socialMap[c.type] = c.value;
          }
          setSocials(socialMap);

          setInitial(
            JSON.stringify({
              shopName: s.shopName || "",
              description: s.description || "",
              imageUrl: s.imageUrl,
              socials: socialMap,
            })
          );
        }
      } catch {
        toast.error(tCommon("errorTitle"));
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [tCommon]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await apiClient.upload<{ url: string }>("/upload", file);
      if (res.success && res.data?.url) {
        setImageUrl(res.data.url);
      }
    } catch {
      toast.error(t("imageUploadError"));
    } finally {
      setIsUploading(false);
    }
  }

  function handleSocialChange(type: string, value: string) {
    setSocials((prev) => ({ ...prev, [type]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      const contacts: ContactEntry[] = [];
      for (const [type, value] of Object.entries(socials)) {
        if (value.trim()) {
          contacts.push({ type, value: value.trim() });
        }
      }

      await apiClient.patch("/sellers/shop", {
        shopName: shopName || undefined,
        description: description || undefined,
        imageUrl: imageUrl ?? undefined,
        contacts,
      });

      // Update initial to reflect saved state
      setInitial(currentState);
      toast.success(t("saveSuccess"));
    } catch {
      toast.error(t("saveError"));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <p className="text-muted-foreground">{t("noShop")}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/seller/shop">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tCommon("back")}
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Shop Image */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              {t("shopImage")}
            </CardTitle>
            <CardDescription>{t("shopImageDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="bg-muted relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border">
                {imageUrl ? (
                  <>
                    <img
                      src={imageUrl}
                      alt={t("shopImage")}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="text-muted-foreground/40 h-8 w-8" />
                  </div>
                )}
              </div>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  asChild
                >
                  <label className="cursor-pointer">
                    {isUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ImageIcon className="mr-2 h-4 w-4" />
                    )}
                    {isUploading ? t("uploading") : t("uploadImage")}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                  </label>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shop Name & Description */}
        <Card>
          <CardHeader>
            <CardTitle>{t("details")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shopName">{t("shopName")}</Label>
              <Input
                id="shopName"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder={t("shopNamePlaceholder")}
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t("description")}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                rows={4}
                maxLength={1000}
                className="resize-none"
              />
              <p className="text-muted-foreground text-right text-xs">
                {description.length}/1000
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card>
          <CardHeader>
            <CardTitle>{t("socialLinks")}</CardTitle>
            <CardDescription>{t("socialLinksDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {SOCIAL_PLATFORMS.map((platform) => (
              <div key={platform.type} className="flex items-center gap-3">
                <img
                  src={platform.icon}
                  alt={platform.label}
                  className="h-6 w-6 shrink-0"
                />
                <Input
                  value={socials[platform.type] || ""}
                  onChange={(e) =>
                    handleSocialChange(platform.type, e.target.value)
                  }
                  placeholder={platform.placeholder}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
