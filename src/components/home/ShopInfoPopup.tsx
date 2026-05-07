"use client";

import { memo, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { Instagram, MessageCircle, Phone, Send, Store, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";

export interface ShopPopupData {
  id: string;
  fullCode: string;
  shopName: string | null;
  description: string | null;
  imageUrl: string | null;
  openingHours: Record<string, string> | null;
  contacts: Array<{ type: string; value: string; label: string | null }>;
  shopType: {
    id: string;
    key: string;
    name_en: string;
    name_ru: string;
    name_am: string | null;
    icon: string | null;
    color: string | null;
  } | null;
  seller: {
    businessName: string | null;
    logoUrl: string | null;
    phone: string | null;
    socialLinks: Record<string, string> | null;
  } | null;
}

interface ShopInfoPopupProps {
  shop: ShopPopupData;
  position: { x: number; y: number };
  onClose: () => void;
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function isOpenNow(openingHours: Record<string, string> | null): boolean | null {
  if (!openingHours) return null;

  const now = new Date();
  const dayKey = DAY_KEYS[now.getDay()];
  const todayHours = openingHours[dayKey];
  if (!todayHours) return null;

  const match = todayHours.match(/^(\d{1,2}):?(\d{2})?\s*-\s*(\d{1,2}):?(\d{2})?$/);
  if (!match) return null;

  const openH = parseInt(match[1]);
  const openM = parseInt(match[2] || "0");
  const closeH = parseInt(match[3]);
  const closeM = parseInt(match[4] || "0");

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

function getPhoneNumber(shop: ShopPopupData): string | null {
  const phoneContact = shop.contacts.find((c) => c.type === "PHONE");
  if (phoneContact) return phoneContact.value;
  return shop.seller?.phone || null;
}

export const ShopInfoPopup = memo(function ShopInfoPopup({
  shop,
  position,
  onClose,
}: ShopInfoPopupProps) {
  const t = useTranslations("home.shopPopup");
  const locale = useLocale();
  const cardRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    // Delay to avoid the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  const openStatus = isOpenNow(shop.openingHours);
  const phone = getPhoneNumber(shop);
  const socialLinks = shop.seller?.socialLinks;
  const displayName = shop.shopName || shop.seller?.businessName || t("noName");
  const imageUrl = shop.imageUrl || shop.seller?.logoUrl;
  const shopTypeName = shop.shopType
    ? (shop.shopType[`name_${locale}` as keyof typeof shop.shopType] as string) ||
      shop.shopType.name_en
    : null;

  return (
    <div
      ref={cardRef}
      className="fixed z-[2000]"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -100%) translateY(-12px)",
      }}
    >
      <Card className="w-72 shadow-xl">
        <button
          className="absolute top-2 right-2 z-10 rounded-full bg-black/40 p-1 text-white hover:bg-black/60"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Image */}
        <div className="bg-muted relative h-32 w-full overflow-hidden rounded-t-lg">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={displayName}
              fill
              className="object-cover"
              sizes="288px"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Store className="text-muted-foreground/50 h-10 w-10" />
            </div>
          )}
        </div>

        <CardContent className="p-3">
          {/* Name + status */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-semibold leading-tight">
              {displayName}
            </h3>
            {openStatus !== null && (
              <Badge
                variant={openStatus ? "default" : "secondary"}
                className="shrink-0 text-xs"
              >
                {openStatus ? t("openNow") : t("closedNow")}
              </Badge>
            )}
          </div>

          {/* Shop type */}
          {shopTypeName && (
            <div className="mt-1 flex items-center gap-1.5">
              {shop.shopType?.icon && (
                <Image
                  src={shop.shopType.icon}
                  alt=""
                  width={14}
                  height={14}
                  className="rounded-sm"
                />
              )}
              <span
                className="text-xs font-medium"
                style={shop.shopType?.color ? { color: shop.shopType.color } : undefined}
              >
                {shopTypeName}
              </span>
            </div>
          )}

          {/* Phone */}
          {phone && (
            <a
              href={`tel:${phone}`}
              className="text-muted-foreground mt-1.5 flex items-center gap-1 text-xs hover:underline"
            >
              <Phone className="h-3 w-3" />
              {phone}
            </a>
          )}

          {/* Social links */}
          {socialLinks && Object.keys(socialLinks).length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              {socialLinks.instagram && (
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-pink-500"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {socialLinks.telegram && (
                <a
                  href={socialLinks.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-blue-500"
                >
                  <Send className="h-4 w-4" />
                </a>
              )}
              {socialLinks.whatsapp && (
                <a
                  href={socialLinks.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-green-500"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              )}
            </div>
          )}

          {/* More Details button */}
          <Link href={`/shops/${shop.fullCode}`} className="mt-3 block">
            <Button size="sm" className="w-full text-xs">
              {t("moreDetails")}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
});

export default ShopInfoPopup;
