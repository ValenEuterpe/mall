"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Upload, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export interface ShopTypeFormData {
  key: string;
  name_en: string;
  name_ru: string;
  name_am: string;
  icon: string;
  color: string;
  supportsProducts: boolean;
  sortOrder: number;
}

interface AddShopTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ShopTypeFormData) => void;
  submitting: boolean;
}

export function AddShopTypeDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: AddShopTypeDialogProps) {
  const t = useTranslations("mallOwner.structure.shopTypes");
  const commonT = useTranslations("common");

  const [nameEn, setNameEn] = useState("");
  const [nameRu, setNameRu] = useState("");
  const [nameAm, setNameAm] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("");
  const [supportsProducts, setSupportsProducts] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toKey(name: string): string {
    return name
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  }

  const resetForm = () => {
    setNameEn("");
    setNameRu("");
    setNameAm("");
    setIcon("");
    setColor("");
    setSupportsProducts(true);
    setSortOrder(0);
  };

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      key: toKey(nameEn),
      name_en: nameEn,
      name_ru: nameRu,
      name_am: nameAm,
      icon,
      color,
      supportsProducts,
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
          <DialogTitle>{t("addType")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="st-name-en">{t("nameEnLabel")}</Label>
              <Input
                id="st-name-en"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-name-ru">{t("nameRuLabel")}</Label>
              <Input
                id="st-name-ru"
                value={nameRu}
                onChange={(e) => setNameRu(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-name-am">{t("nameAmLabel")}</Label>
              <Input
                id="st-name-am"
                value={nameAm}
                onChange={(e) => setNameAm(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-2">
              <Label htmlFor="st-color">{t("colorLabel")}</Label>
              <div className="flex gap-2">
                <Input
                  id="st-color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#FF5733"
                  pattern="^#[0-9a-fA-F]{6}$"
                />
                {color && (
                  <div
                    className="h-9 w-9 shrink-0 rounded-md border"
                    style={{ backgroundColor: color }}
                  />
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              id="st-supports-products"
              checked={supportsProducts}
              onCheckedChange={(checked) =>
                setSupportsProducts(checked === true)
              }
            />
            <div>
              <Label htmlFor="st-supports-products" className="cursor-pointer">
                {t("supportsProductsLabel")}
              </Label>
              <p className="text-muted-foreground text-xs">
                {t("supportsProductsHelp")}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="st-sort-order">{t("sortOrderLabel")}</Label>
            <Input
              id="st-sort-order"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              min={0}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {commonT("cancel")}
            </Button>
            <Button type="submit" disabled={submitting || !nameEn || !nameRu}>
              {submitting ? "..." : t("addType")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
