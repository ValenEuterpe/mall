"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Clock,
  Phone,
  Mail,
  MapPin,
  Instagram,
  Facebook,
  Send,
  Building2,
} from "lucide-react";

import { apiClient } from "@/lib/api-client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SocialLinks {
  instagram?: string;
  facebook?: string;
  telegram?: string;
}

interface MallAbout {
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
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

function getLocalizedField(
  data: MallAbout,
  field: "description" | "policies",
  locale: string
): string | null {
  const key = `${field}_${locale}` as keyof MallAbout;
  const value = data[key] as string | null;
  if (value) return value;
  // Fallback to English
  return data[`${field}_en` as keyof MallAbout] as string | null;
}

export default function AboutPage(): React.ReactElement {
  const t = useTranslations("about");
  const locale = useLocale();

  const [data, setData] = useState<MallAbout | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAbout = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<MallAbout>("/public/about");
      if (response.success && response.data) {
        setData(response.data as MallAbout);
      }
    } catch (err) {
      console.error("Failed to fetch about info:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAbout();
  }, [fetchAbout]);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl space-y-6 p-6">
        <Skeleton className="mx-auto h-10 w-64" />
        <Skeleton className="mx-auto h-4 w-96" />
        <Skeleton className="h-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">{t("noInfo")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const description = getLocalizedField(data, "description", locale);
  const policies = getLocalizedField(data, "policies", locale);
  const socialLinks = data.socialLinks as SocialLinks | null;
  const hasSocialLinks =
    socialLinks && (socialLinks.instagram || socialLinks.facebook || socialLinks.telegram);
  const hasContact = data.contactPhone || data.contactEmail;

  return (
    <div className="container mx-auto max-w-4xl space-y-8 p-6">
      {/* Header */}
      <div className="text-center">
        {data.logoUrl && (
          <img
            src={data.logoUrl}
            alt={data.name}
            className="mx-auto mb-4 h-20 w-20 rounded-xl object-cover"
          />
        )}
        <h1 className="text-3xl font-bold tracking-tight">{data.name}</h1>
        {data.address && (
          <p className="mt-2 flex items-center justify-center gap-1 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {data.address}
          </p>
        )}
      </div>

      {/* Description */}
      {description && (
        <Card>
          <CardHeader>
            <CardTitle>{t("description")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-muted-foreground leading-relaxed">
              {description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Info Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Working Hours */}
        {data.workingHours && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5 text-primary" />
                {t("workingHours")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {data.workingHours}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Contact Info */}
        {hasContact && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Phone className="h-5 w-5 text-primary" />
                {t("contactInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.contactPhone && (
                <a
                  href={`tel:${data.contactPhone}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  {data.contactPhone}
                </a>
              )}
              {data.contactEmail && (
                <a
                  href={`mailto:${data.contactEmail}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {data.contactEmail}
                </a>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Social Links */}
      {hasSocialLinks && (
        <Card>
          <CardHeader>
            <CardTitle>{t("socialLinks")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {socialLinks.instagram && (
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-accent"
                >
                  <Instagram className="h-5 w-5" />
                  Instagram
                </a>
              )}
              {socialLinks.facebook && (
                <a
                  href={socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-accent"
                >
                  <Facebook className="h-5 w-5" />
                  Facebook
                </a>
              )}
              {socialLinks.telegram && (
                <a
                  href={socialLinks.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-accent"
                >
                  <Send className="h-5 w-5" />
                  Telegram
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Policies */}
      {policies && (
        <Card>
          <CardHeader>
            <CardTitle>{t("policies")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm text-muted-foreground leading-relaxed">
              {policies}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
