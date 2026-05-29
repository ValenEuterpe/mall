"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";

export interface TagFormData {
  key: string;
  categoryId: string;
  subcategoryId: string | null;
  name_en: string;
  name_ru: string;
  name_am: string | null;
  sortOrder: number;
}

interface AddTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TagFormData) => void;
  submitting: boolean;
  categoryId: string;
  categoryName: string;
}

const cyrillic = /[Ѐ-ӿ]/;
const armenian = /[԰-֏]/;
const latin = /[a-zA-Z]/;

export function AddTagDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
  categoryId,
  categoryName,
}: AddTagDialogProps) {
  const t = useTranslations("mallOwner.tags");
  const sellerT = useTranslations("seller.productForm");
  const commonT = useTranslations("common");

  const [nameEn, setNameEn] = useState("");
  const [nameRu, setNameRu] = useState("");
  const [nameAm, setNameAm] = useState("");
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState(0);
  const [subcategories, setSubcategories] = useState<Array<{ id: string; name_en: string }>>([]);
  const [translating, setTranslating] = useState(false);
  const [transliterationPreview, setTransliterationPreview] = useState("");

  useEffect(() => {
    if (!open || !categoryId || categoryId === "all") return;
    
    const fetchSubcategories = async () => {
      try {
        const res = await apiClient.get<any[]>(`/mall/categories`);
        if (res.success) {
          const category = res.data.find((c) => c.id === categoryId);
          if (category) {
            setSubcategories(category.subcategories || []);
          }
        }
      } catch (err) {
        console.error("Failed to fetch subcategories", err);
      }
    };
    void fetchSubcategories();
  }, [open, categoryId]);

  // Live transliteration preview
  const transliterationSource = [nameRu, nameAm].filter(Boolean).join(" ");
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
        // best-effort
      }
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [transliterationSource]);

  const latinInCyrillic = useMemo(
    () => nameRu.trim().length >= 2 && latin.test(nameRu) && !cyrillic.test(nameRu),
    [nameRu]
  );
  const latinInArmenian = useMemo(
    () => nameAm.trim().length >= 2 && latin.test(nameAm) && !armenian.test(nameAm),
    [nameAm]
  );

  const handleAutoFill = async () => {
    const source = nameRu || nameEn || nameAm;
    if (!source.trim()) return;
    setTranslating(true);
    try {
      const res = await apiClient.post<{
        translations: { en: string; ru: string; am: string };
      }>(
        "/translate",
        { type: "text", text: source },
        { showErrorToast: false }
      );
      if (res.success) {
        if (!nameEn.trim()) setNameEn(res.data.translations.en);
        if (!nameRu.trim()) setNameRu(res.data.translations.ru);
        if (!nameAm.trim()) setNameAm(res.data.translations.am);
      }
    } catch {
      // ignore
    } finally {
      setTranslating(false);
    }
  };

  const toKey = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  };

  const resetForm = () => {
    setNameEn("");
    setNameRu("");
    setNameAm("");
    setSubcategoryId(null);
    setSortOrder(0);
    setTransliterationPreview("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      key: toKey(nameEn) || toKey(nameRu) || `tag-${Date.now()}`,
      categoryId,
      subcategoryId,
      name_en: nameEn,
      name_ru: nameRu,
      name_am: nameAm || null,
      sortOrder,
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("addTag")}</DialogTitle>
          <DialogDescription>
            {t("addTagDescription", { category: categoryName })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {subcategories.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="tag-subcategory">{t("subcategoryNone")}</Label>
                <Select
                  value={subcategoryId || "none"}
                  onValueChange={(v) => setSubcategoryId(v === "none" ? null : v)}
                >
                  <SelectTrigger id="tag-subcategory">
                    <SelectValue placeholder={t("subcategoryNone")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("subcategoryNone")}</SelectItem>
                    {subcategories.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="tag-name-en">{t("nameEnLabel")}</Label>
              <Input
                id="tag-name-en"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Joggers"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag-name-ru">{t("nameRuLabel")}</Label>
              <Input
                id="tag-name-ru"
                value={nameRu}
                onChange={(e) => setNameRu(e.target.value)}
                placeholder="e.g. Джоггеры"
              />
              {latinInCyrillic && (
                <p className="text-xs text-amber-700 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {sellerT("latinInCyrillicWarning")}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag-name-am">{t("nameAmLabel")}</Label>
              <Input
                id="tag-name-am"
                value={nameAm}
                onChange={(e) => setNameAm(e.target.value)}
                placeholder="e.g. Ջոգերներ"
              />
              {latinInArmenian && (
                <p className="text-xs text-amber-700 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {sellerT("latinInArmenianWarning")}
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={translating || !(nameEn.trim() || nameRu.trim() || nameAm.trim())}
              onClick={handleAutoFill}
              className="w-full"
            >
              {translating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {sellerT("autoFillingInProgress")}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {sellerT("autoFillOtherLanguages")}
                </>
              )}
            </Button>

            {transliterationPreview && (
              <div className="rounded-md border bg-background p-2 text-xs">
                <span className="text-muted-foreground">{sellerT("latinFormForSearch")}: </span>
                <span className="font-mono">{transliterationPreview}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tag-sort-order">{t("sortOrderLabel")}</Label>
              <Input
                id="tag-sort-order"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {commonT("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={submitting || (!nameEn.trim() && !nameRu.trim() && !nameAm.trim())}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("addTag")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
