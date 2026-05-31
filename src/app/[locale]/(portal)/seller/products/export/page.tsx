"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";

import { apiClient } from "@/lib/api-client";
import { useRequireRole } from "@/hooks/use-auth";
import { Link } from "@/i18n/routing";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export default function SellerProductsExportPage(): React.ReactElement {
  const t = useTranslations("portal.sellerProductsExport");
  const { isAuthorized, isLoading: isAuthLoading } = useRequireRole(
    "SELLER",
    "/unauthorized"
  );

  const [includeInactive, setIncludeInactive] = useState(false);
  const [includeImages, setIncludeImages] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  async function downloadTemplate(): Promise<void> {
    await apiClient.download(
      "/sellers/products/export?template=true",
      "product-import-template.xlsx"
    );
  }

  async function exportProducts(): Promise<void> {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("includeInactive", includeInactive ? "true" : "false");
      params.set("includeImages", includeImages ? "true" : "false");
      const endpoint = `/sellers/products/export?${params.toString()}`;

      await apiClient.download(endpoint, "products.xlsx");
    } finally {
      setIsExporting(false);
    }
  }

  if (isAuthLoading) return <div className="p-6">{t("loading")}</div>;
  if (!isAuthorized) return <></>;

  return (
    <div className="container mx-auto max-w-3xl space-y-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/seller/products">{t("actions.back")}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">{t("template.title")}</CardTitle>
          <Button variant="outline" onClick={downloadTemplate}>
            {t("template.download")}
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("template.help")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("export.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={includeInactive}
                onCheckedChange={(v) => setIncludeInactive(Boolean(v))}
              />
              {t("export.includeInactive")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={includeImages}
                onCheckedChange={(v) => setIncludeImages(Boolean(v))}
              />
              {t("export.includeImages")}
            </label>
          </div>

          <Button onClick={exportProducts} disabled={isExporting}>
            {isExporting ? t("actions.exporting") : t("actions.export")}
          </Button>

          <p className="text-muted-foreground text-xs">{t("export.note")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
