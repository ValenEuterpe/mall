"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

export function BackButton(): React.ReactElement | null {
  const t = useTranslations("common");
  const [hasReferrer, setHasReferrer] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      setHasReferrer(true);
    }
  }, []);

  if (!hasReferrer) {
    return (
      <Button variant="ghost" size="sm" asChild>
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("back")}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => window.history.back()}
      type="button"
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      {t("back")}
    </Button>
  );
}
