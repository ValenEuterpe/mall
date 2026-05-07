"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Twitter,
  Youtube,
} from "lucide-react";

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

interface SocialLink {
  icon: React.ReactNode;
  href: string;
  label: string;
}

export interface FooterProps {
  sections?: FooterSection[];
  companyInfo?: {
    name: string;
    description?: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  socialLinks?: SocialLink[];
  className?: string;
}

const DEFAULT_SECTIONS: FooterSection[] = [
  {
    title: "quickLinks",
    links: [
      { label: "home", href: "/" },
      { label: "about", href: "/about" },
    ],
  },
  {
    title: "support",
    links: [
      { label: "helpCenter", href: "/help" },
      { label: "faq", href: "/faq" },
    ],
  },
];

const DEFAULT_SOCIAL_LINKS: SocialLink[] = [
  { icon: <Facebook className="h-4 w-4" />, href: "#", label: "Facebook" },
  { icon: <Twitter className="h-4 w-4" />, href: "#", label: "Twitter" },
  { icon: <Instagram className="h-4 w-4" />, href: "#", label: "Instagram" },
  { icon: <Linkedin className="h-4 w-4" />, href: "#", label: "LinkedIn" },
  { icon: <Youtube className="h-4 w-4" />, href: "#", label: "YouTube" },
];

function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-primary", className)}
    >
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path
        d="M8 12L16 8L24 12V20L16 24L8 20V12Z"
        stroke="white"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M16 8V24M8 12L24 20M24 12L8 20"
        stroke="white"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function FooterLinkList({ section }: { section: FooterSection }) {
  const t = useTranslations("footer");

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold tracking-wide uppercase">
        {t(section.title)}
      </h3>
      <ul className="space-y-1">
        {section.links.map((link) => (
          <li key={link.href}>
            {link.external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
              >
                {t(link.label)}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-muted-foreground hover:text-foreground text-xs transition-colors"
              >
                {t(link.label)}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContactInfo({
  address,
  email,
  phone,
}: {
  address?: string;
  email?: string;
  phone?: string;
}) {
  const t = useTranslations("footer");

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold tracking-wide uppercase">
        {t("contact")}
      </h3>
      <ul className="space-y-1">
        {address && (
          <li className="text-muted-foreground flex items-start gap-2 text-xs">
            <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>{address}</span>
          </li>
        )}
        {email && (
          <li>
            <a
              href={`mailto:${email}`}
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-xs transition-colors"
            >
              <Mail className="h-3.5 w-3.5 flex-shrink-0" />
              {email}
            </a>
          </li>
        )}
        {phone && (
          <li>
            <a
              href={`tel:${phone.replace(/\\s/g, "")}`}
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-xs transition-colors"
            >
              <Phone className="h-3.5 w-3.5 flex-shrink-0" />
              {phone}
            </a>
          </li>
        )}
      </ul>
    </div>
  );
}

function SocialLinks({ links }: { links: SocialLink[] }) {
  return (
    <div className="flex items-center gap-1.5">
      {links.map((link) => (
        <Button
          key={link.label}
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          asChild
        >
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.label}
          >
            {link.icon}
          </a>
        </Button>
      ))}
    </div>
  );
}

export function Footer({
  sections = DEFAULT_SECTIONS,
  companyInfo = {
    name: "Wholesale Market",
    description:
      "Your one-stop destination for wholesale shopping with interactive navigation.",
    address: "123 Market Street, City, Country",
    email: "info@wholesalemarket.com",
    phone: "+1 234 567 890",
  },
  socialLinks = DEFAULT_SOCIAL_LINKS,
  className,
}: FooterProps) {
  const t = useTranslations("footer");
  const currentYear = new Date().getFullYear();

  return (
    <footer className={cn("bg-background border-t", className)}>
      <div className="container py-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="space-y-2 lg:col-span-4">
            <Link href="/" className="flex items-center gap-1.5">
              <Logo className="h-5 w-5" />
              <span className="text-sm font-bold">{companyInfo.name}</span>
            </Link>
            {companyInfo.description && (
              <p className="text-muted-foreground max-w-xs text-xs">
                {companyInfo.description}
              </p>
            )}
            <SocialLinks links={socialLinks} />
          </div>

          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {sections.map((section) => (
                <FooterLinkList key={section.title} section={section} />
              ))}
              <ContactInfo
                address={companyInfo.address}
                email={companyInfo.email}
                phone={companyInfo.phone}
              />
            </div>
          </div>
        </div>

        <div className="mt-0 flex flex-col gap-2 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs">
            &copy; {currentYear} {companyInfo.name}. {t("allRightsReserved")}
          </p>

          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              {t("terms")}
            </Link>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              {t("privacy")}
            </Link>
            <Link
              href="/cookies"
              className="hover:text-foreground transition-colors"
            >
              {t("cookies")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
