"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { apiClient, ApiClientError } from "@/lib/api-client";

type Locale = "en" | "ru" | "am";

interface CreatedTag {
  id: string;
  key: string;
  name_en: string;
  name_ru: string;
  name_am: string | null;
  categoryId: string;
  subcategoryId: string | null;
}

interface DedupCandidate {
  id: string;
  key: string;
  name_en: string;
  name_ru: string;
  name_am: string | null;
  score: number;
}

interface CreateTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  subcategoryId: string | null;
  onCreated: (tag: CreatedTag) => void;
  /** When the dialog opens with this query pre-filled (from the tag picker search). */
  initialQuery?: string;
}

const cyrillic = /[Ѐ-ӿ]/;
const armenian = /[԰-֏]/;
const latin = /[a-zA-Z]/;

export function CreateTagDialog({
  open,
  onOpenChange,
  categoryId,
  subcategoryId,
  onCreated,
  initialQuery,
}: CreateTagDialogProps) {
  const t = useTranslations("seller.productForm");
  const commonT = useTranslations("common");
  const locale = useLocale() as Locale;

  const [name_en, setNameEn] = useState("");
  const [name_ru, setNameRu] = useState("");
  const [name_am, setNameAm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [transliterationPreview, setTransliterationPreview] = useState("");
  const [candidates, setCandidates] = useState<DedupCandidate[]>([]);
  const [showCandidates, setShowCandidates] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state on close; pre-fill the seller's source-language field on open.
  useEffect(() => {
    if (!open) {
      setNameEn("");
      setNameRu("");
      setNameAm("");
      setTransliterationPreview("");
      setCandidates([]);
      setShowCandidates(false);
      setError(null);
      return;
    }
    if (initialQuery) {
      if (locale === "ru") setNameRu(initialQuery);
      else if (locale === "am") setNameAm(initialQuery);
      else setNameEn(initialQuery);
    }
  }, [open, initialQuery, locale]);

  // Live transliteration preview (server-rendered so we don't ship the lib client-side).
  const transliterationSource = [name_ru, name_am].filter(Boolean).join(" ");
  useEffect(() => {
    if (!transliterationSource.trim()) {
      setTransliterationPreview("");
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await apiClient.get<{ text: string }>(
          `/translate/transliterate?text=${encodeURIComponent(transliterationSource)}`,
          undefined,
          { signal: controller.signal, showErrorToast: false }
        );
        if (res.success) setTransliterationPreview(res.data.text);
      } catch {
        // best-effort preview
      }
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [transliterationSource]);

  // Live dedup check — show "did you mean…" candidates as the seller types.
  useEffect(() => {
    if (!open) return;
    const en = name_en.trim();
    const ru = name_ru.trim();
    const am = name_am.trim();
    if (!en && !ru && !am) {
      setCandidates([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await apiClient.post<{ candidates: DedupCandidate[] }>(
          `/tags/dedup-check`,
          { categoryId, subcategoryId, name_en: en, name_ru: ru, name_am: am },
          { signal: controller.signal, showErrorToast: false }
        );
        if (res.success) setCandidates(res.data.candidates);
      } catch {
        // ignore
      }
    }, 300);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [name_en, name_ru, name_am, categoryId, subcategoryId, open]);

  const latinInCyrillic = useMemo(
    () => name_ru.trim().length >= 2 && latin.test(name_ru) && !cyrillic.test(name_ru),
    [name_ru]
  );
  const latinInArmenian = useMemo(
    () => name_am.trim().length >= 2 && latin.test(name_am) && !armenian.test(name_am),
    [name_am]
  );

  const handleAutoFill = async () => {
    const source = name_ru || name_en || name_am;
    if (!source.trim()) return;
    setTranslating(true);
    setError(null);
    try {
      const res = await apiClient.post<{
        translations: { en: string; ru: string; am: string };
      }>(
        "/translate",
        { type: "text", text: source },
        { showErrorToast: false }
      );
      if (res.success) {
        if (!name_en.trim()) setNameEn(res.data.translations.en);
        if (!name_ru.trim()) setNameRu(res.data.translations.ru);
        if (!name_am.trim()) setNameAm(res.data.translations.am);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTranslating(false);
    }
  };

  const doCreate = async (force: boolean) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiClient.post<CreatedTag>(
        "/tags",
        {
          categoryId,
          subcategoryId,
          name_en: name_en.trim() || undefined,
          name_ru: name_ru.trim() || undefined,
          name_am: name_am.trim() || undefined,
          force,
        },
        { showErrorToast: false }
      );
      if (res.success) {
        onCreated(res.data);
        onOpenChange(false);
        return;
      }
      // Server returned success: false envelope
      setError("error" in res ? res.error.message : t("tagCreateError"));
    } catch (e) {
      if (e instanceof ApiClientError && e.code === "NEAR_MATCH") {
        const details = (e.details as { candidates?: DedupCandidate[] } | undefined) ?? {};
        setCandidates(details.candidates ?? []);
        setShowCandidates(true);
      } else {
        setError(e instanceof Error ? e.message : t("tagCreateError"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doCreate(false);
  };

  const pickCandidate = (c: DedupCandidate) => {
    onCreated({
      id: c.id,
      key: c.key,
      name_en: c.name_en,
      name_ru: c.name_ru,
      name_am: c.name_am,
      categoryId,
      subcategoryId,
    });
    onOpenChange(false);
  };

  const canSubmit = (name_en.trim() || name_ru.trim() || name_am.trim()) && !submitting;
  const tagLabel = (c: DedupCandidate): string => {
    if (locale === "ru") return c.name_ru || c.name_en;
    if (locale === "am") return c.name_am || c.name_en;
    return c.name_en;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("createTagDialogTitle")}</DialogTitle>
          <DialogDescription>{t("createTagDialogDescription")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Suggestions surface (live + after a 409) */}
          {candidates.length > 0 && (
            <div className="rounded-md border bg-muted/40 p-3 space-y-2">
              <p className="text-sm font-medium">
                {showCandidates ? t("nearMatchFound") : t("didYouMean")}
              </p>
              <div className="flex flex-wrap gap-2">
                {candidates.slice(0, 5).map((c) => (
                  <Badge
                    key={c.id}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors py-1.5 px-3"
                    onClick={() => pickCandidate(c)}
                    title={t("useThisInstead")}
                  >
                    {tagLabel(c)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ct-en">English</Label>
              <Input
                id="ct-en"
                value={name_en}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder={t("nameInLanguagePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ct-ru">Русский</Label>
              <Input
                id="ct-ru"
                value={name_ru}
                onChange={(e) => setNameRu(e.target.value)}
                placeholder={t("nameInLanguagePlaceholder")}
              />
              {latinInCyrillic && (
                <p className="text-xs text-amber-700 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {t("latinInCyrillicWarning")}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ct-am">Հայերեն</Label>
              <Input
                id="ct-am"
                value={name_am}
                onChange={(e) => setNameAm(e.target.value)}
                placeholder={t("nameInLanguagePlaceholder")}
              />
              {latinInArmenian && (
                <p className="text-xs text-amber-700 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {t("latinInArmenianWarning")}
                </p>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={translating || !(name_en.trim() || name_ru.trim() || name_am.trim())}
            onClick={handleAutoFill}
            className="w-full"
          >
            {translating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("autoFillingInProgress")}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {t("autoFillOtherLanguages")}
              </>
            )}
          </Button>

          {transliterationPreview && (
            <div className="rounded-md border bg-background p-2 text-xs">
              <span className="text-muted-foreground">{t("latinFormForSearch")}: </span>
              <span className="font-mono">{transliterationPreview}</span>
              <p className="mt-1 text-[10px] text-muted-foreground italic">
                {t("latinFormHint")}
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {commonT("cancel")}
            </Button>
            {showCandidates ? (
              <Button
                type="button"
                onClick={() => doCreate(true)}
                disabled={submitting}
                variant="default"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("createAnyway")}
              </Button>
            ) : (
              <Button type="submit" disabled={!canSubmit}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("createNewTag")}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
