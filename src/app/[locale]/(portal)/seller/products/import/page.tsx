"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, CheckCircle2, Loader2, Upload } from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { useRequireRole } from "@/hooks/use-auth";
import { Link } from "@/i18n/routing";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ImportResult = {
  success: boolean;
  message: string;
  stats: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  errors: Array<{ row: number; message: string }>;
  warnings: string[];
  duration: number;
};

type PreviewData = {
  headers: string[];
  sampleData: Array<Record<string, string>>;
  autoMapping: Record<string, string | null>;
  totalRows: number;
};

type Step = "upload" | "mapping";

const REQUIRED_FIELDS = ["name"];

const MAPPABLE_FIELDS = [
  "name",
  "description",
  "price",
  "stock",
  "sku",
  "barcode",
  "brand",
  "category",
  "status",
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SellerProductsImportPage(): React.ReactElement {
  const t = useTranslations("portal.sellerProductsImport");
  const { isAuthorized, isLoading: isAuthLoading } = useRequireRole("SELLER", "/unauthorized");

  // Step state
  const [step, setStep] = useState<Step>("upload");

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [skipErrors, setSkipErrors] = useState(false);
  const [dryRun, setDryRun] = useState(false);

  // Preview / mapping state
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isPreviewing, setIsPreviewing] = useState(false);

  // Import state
  const [progress, setProgress] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Derived
  // -------------------------------------------------------------------------

  const mappedFields = useMemo(() => new Set(Object.values(columnMapping)), [columnMapping]);

  const allRequiredMapped = useMemo(
    () => REQUIRED_FIELDS.every((f) => mappedFields.has(f)),
    [mappedFields]
  );

  const canSubmit = useMemo(
    () => !!file && !isSubmitting && allRequiredMapped,
    [file, isSubmitting, allRequiredMapped]
  );

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleFileSelect = useCallback(
    async (selectedFile: File | null) => {
      setFile(selectedFile);
      setResult(null);
      setError(null);

      if (!selectedFile) {
        setStep("upload");
        setPreview(null);
        setColumnMapping({});
        return;
      }

      // Preview the file to get headers
      setIsPreviewing(true);
      try {
        const res = await apiClient.upload<PreviewData>(
          "/sellers/products/import/preview",
          selectedFile,
          { showErrorToast: false, showSuccessToast: false }
        );

        if (res.success && res.data) {
          const data = res.data;
          setPreview(data);

          // Initialize mapping from auto-detected matches
          const initial: Record<string, string> = {};
          for (const [header, field] of Object.entries(data.autoMapping)) {
            if (field) {
              initial[header] = field;
            }
          }
          setColumnMapping(initial);
          setStep("mapping");
        }
      } catch {
        setError(t("errors.previewFailed"));
      } finally {
        setIsPreviewing(false);
      }
    },
    [t]
  );

  const handleMappingChange = useCallback(
    (header: string, value: string) => {
      setColumnMapping((prev) => {
        const next = { ...prev };
        if (value === "__skip__") {
          delete next[header];
        } else {
          next[header] = value;
        }
        return next;
      });
    },
    []
  );

  const handleBackToUpload = useCallback(() => {
    setStep("upload");
    setFile(null);
    setPreview(null);
    setColumnMapping({});
    setResult(null);
    setError(null);
  }, []);

  async function onSubmit(): Promise<void> {
    if (!file) return;
    setIsSubmitting(true);
    setProgress(0);
    setResult(null);
    setError(null);

    try {
      const res = await apiClient.upload<ImportResult>(
        "/sellers/products/import",
        file,
        {
          additionalData: {
            updateExisting: updateExisting ? "true" : "false",
            skipErrors: skipErrors ? "true" : "false",
            dryRun: dryRun ? "true" : "false",
            columnMapping: JSON.stringify(columnMapping),
          },
          onProgress: (p) => setProgress(p),
          showSuccessToast: false,
        }
      );

      if (res.success) {
        setResult(res.data);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("errors.importFailed");
      setError(msg);
    } finally {
      setIsSubmitting(false);
      setProgress(null);
    }
  }

  async function downloadTemplate(): Promise<void> {
    try {
      await apiClient.download(
        "/sellers/products/export?template=true",
        "product-import-template.xlsx",
        { showErrorToast: true }
      );
    } catch {
      // apiClient shows toast
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (isAuthLoading) return <div className="p-6">{t("loading")}</div>;
  if (!isAuthorized) return <></>;

  return (
    <div className="container mx-auto max-w-4xl space-y-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/seller/products">{t("actions.back")}</Link>
        </Button>
      </div>

      {/* Template download */}
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">{t("template.title")}</CardTitle>
          <Button variant="outline" onClick={downloadTemplate}>
            {t("template.download")}
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("template.help")}</p>
        </CardContent>
      </Card>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("form.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">{t("form.fileLabel")}</Label>
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">{t("form.fileHelp")}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={updateExisting}
                  onCheckedChange={(v) => setUpdateExisting(Boolean(v))}
                />
                {t("form.updateExisting")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={skipErrors}
                  onCheckedChange={(v) => setSkipErrors(Boolean(v))}
                />
                {t("form.skipErrors")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={dryRun}
                  onCheckedChange={(v) => setDryRun(Boolean(v))}
                />
                {t("form.dryRun")}
              </label>
            </div>

            {isPreviewing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("loading")}
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column Mapping */}
      {step === "mapping" && preview && (
        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">{t("mapping.title")}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("mapping.subtitle")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("mapping.rowsFound", { count: preview.totalRows })}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleBackToUpload}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t("mapping.backToUpload")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Options row */}
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={updateExisting}
                  onCheckedChange={(v) => setUpdateExisting(Boolean(v))}
                />
                {t("form.updateExisting")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={skipErrors}
                  onCheckedChange={(v) => setSkipErrors(Boolean(v))}
                />
                {t("form.skipErrors")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={dryRun}
                  onCheckedChange={(v) => setDryRun(Boolean(v))}
                />
                {t("form.dryRun")}
              </label>
            </div>

            {/* Mapping table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">
                      {t("mapping.excelColumn")}
                    </TableHead>
                    <TableHead>{t("mapping.sampleData")}</TableHead>
                    <TableHead className="w-[220px]">
                      {t("mapping.mapTo")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.headers.map((header) => {
                    const currentValue = columnMapping[header] ?? "__skip__";
                    const isAutoMatched = preview.autoMapping[header] !== null;
                    const isRequired =
                      currentValue !== "__skip__" &&
                      REQUIRED_FIELDS.includes(currentValue);

                    return (
                      <TableRow key={header}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{header}</span>
                            {isAutoMatched && currentValue !== "__skip__" && (
                              <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
                                {t("mapping.autoMatched")}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {preview.sampleData.map((row, i) => (
                              <span
                                key={i}
                                className="truncate text-xs text-muted-foreground"
                                title={row[header]}
                              >
                                {row[header] || "—"}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={currentValue}
                            onValueChange={(v) => handleMappingChange(header, v)}
                          >
                            <SelectTrigger
                              className={
                                isRequired
                                  ? "border-green-500/50"
                                  : currentValue === "__skip__"
                                    ? "text-muted-foreground"
                                    : ""
                              }
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__skip__">
                                {t("mapping.skip")}
                              </SelectItem>
                              {MAPPABLE_FIELDS.map((field) => {
                                const alreadyUsed =
                                  mappedFields.has(field) &&
                                  columnMapping[header] !== field;
                                return (
                                  <SelectItem
                                    key={field}
                                    value={field}
                                    disabled={alreadyUsed}
                                  >
                                    {t(`mapping.fields.${field}`)}
                                    {REQUIRED_FIELDS.includes(field) ? " *" : ""}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Required fields warning */}
            {!allRequiredMapped && (
              <p className="text-sm text-destructive">
                {t("mapping.unmappedRequired")}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button onClick={onSubmit} disabled={!canSubmit}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("actions.importing")}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {t("actions.import")}
                  </>
                )}
              </Button>
              {progress !== null && (
                <p className="text-xs text-muted-foreground">
                  {t("progress", { progress })}
                </p>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* Results */}
            {result && <ImportResultCard result={result} t={t} />}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result sub-component
// ---------------------------------------------------------------------------

function ImportResultCard({
  result,
  t,
}: {
  result: ImportResult;
  t: ReturnType<typeof useTranslations>;
}): React.ReactElement {
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center gap-2">
        {result.success && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        <p className="text-sm font-medium">{result.message}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-5">
        <div className="text-xs">
          <span className="text-muted-foreground">{t("result.total")}: </span>
          {result.stats.total}
        </div>
        <div className="text-xs">
          <span className="text-muted-foreground">{t("result.created")}: </span>
          {result.stats.created}
        </div>
        <div className="text-xs">
          <span className="text-muted-foreground">{t("result.updated")}: </span>
          {result.stats.updated}
        </div>
        <div className="text-xs">
          <span className="text-muted-foreground">{t("result.skipped")}: </span>
          {result.stats.skipped}
        </div>
        <div className="text-xs">
          <span className="text-muted-foreground">{t("result.failed")}: </span>
          {result.stats.failed}
        </div>
      </div>

      {result.warnings?.length ? (
        <div className="space-y-1">
          <p className="text-xs font-medium">{t("result.warnings")}</p>
          <ul className="list-inside list-disc text-xs text-muted-foreground">
            {result.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.errors?.length ? (
        <div className="space-y-1">
          <p className="text-xs font-medium">{t("result.errors")}</p>
          <ul className="list-inside list-disc text-xs text-destructive">
            {result.errors.slice(0, 20).map((e, idx) => (
              <li key={idx}>
                {t("result.errorRow", { row: e.row })}: {e.message}
              </li>
            ))}
          </ul>
          {result.errors.length > 20 && (
            <p className="text-xs text-muted-foreground">
              {t("result.errorsTruncated", { count: result.errors.length - 20 })}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
