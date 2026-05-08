"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

export function BackButton(): React.ReactElement {
  const t = useTranslations("common");

  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href="/">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("back")}
      </Link>
    </Button>
  );
}
