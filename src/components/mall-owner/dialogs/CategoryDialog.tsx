"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Upload, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";
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

export type CategoryLevel = "category" | "subcategory" | "subSubcategory";

export interface CategoryFormData {
  id?: string;
  key: string;
  name_en: string;
  name_ru: string;
  name_am: string;
  icon?: string;
}

export interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  level: CategoryLevel;
  initialData?: CategoryFormData | null;
  parentName?: string;
  onSubmit: (data: CategoryFormData) => void;
  submitting: boolean;
}

export function CategoryDialog({
  open,
  onOpenChange,
  mode,
  level,
  initialData,
  parentName,
  onSubmit,
  submitting,
}: CategoryDialogProps) {
  const t = useTranslations("mallOwner.categories");
  const commonT = useTranslations("common");

  const [nameEn, setNameEn] = useState("");
  const [nameRu, setNameRu] = useState("");
  const [nameAm, setNameAm] = useState("");
  const [icon, setIcon] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await apiClient.upload<{ url: string }>("/upload", file);
      if (res.success && res.data?.url) {
        setIcon(res.data.url);
      }
    } catch {
      // handled by apiClient
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  function toKey(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  }

  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialData) {
        setNameEn(initialData.name_en);
        setNameRu(initialData.name_ru);
        setNameAm(initialData.name_am);
        setIcon(initialData.icon || "");
      } else {
        setNameEn("");
        setNameRu("");
        setNameAm("");
        setIcon("");
      }
    }
  }, [open, mode, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const generatedKey =
      mode === "edit" && initialData ? initialData.key : toKey(nameEn);
    onSubmit({
      id: initialData?.id,
      key: generatedKey,
      name_en: nameEn,
      name_ru: nameRu,
      name_am: nameAm,
      icon: level === "category" ? icon : undefined,
    });
  };

  const titleKey = mode === "create" ? "addTitle" : "editTitle";
  const levelLabel =
    level === "category"
      ? t("addCategory")
      : level === "subcategory"
        ? t("addSubcategory")
        : t("addSubSubcategory");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t(titleKey)} — {levelLabel}
          </DialogTitle>
          <DialogDescription>
            {parentName ? `${parentName}` : t("description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cat-name-en">{t("nameEnLabel")}</Label>
              <Input
                id="cat-name-en"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-name-ru">{t("nameRuLabel")}</Label>
              <Input
                id="cat-name-ru"
                value={nameRu}
                onChange={(e) => setNameRu(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-name-am">{t("nameAmLabel")}</Label>
              <Input
                id="cat-name-am"
                value={nameAm}
                onChange={(e) => setNameAm(e.target.value)}
              />
            </div>
          </div>
          {level === "category" && (
            <div className="space-y-2">
              <Label>{t("iconLabel")}</Label>
              <div className="flex items-center gap-2">
                {icon ? (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border">
                    <img
                      src={icon}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      className="bg-destructive text-destructive-foreground absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full"
                      onClick={() => setIcon("")}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-1 h-3 w-3" />
                    {uploading ? "..." : t("iconLabel")}
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleIconUpload}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {commonT("cancel")}
            </Button>
            <Button type="submit" disabled={submitting || !nameEn || !nameRu}>
              {submitting
                ? "..."
                : mode === "create"
                  ? commonT("save")
                  : commonT("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
