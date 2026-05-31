"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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

interface AddBuildingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, code: string) => void;
}

export function AddBuildingDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddBuildingDialogProps) {
  const t = useTranslations("mapEditor.dialogs.addBuilding");
  const commonT = useTranslations("common");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(name, code.toUpperCase());
    setName("");
    setCode("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="building-name">{t("nameLabel")}</Label>
            <Input
              id="building-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              required
            />
          </div>
          <div>
            <Label htmlFor="building-code">{t("codeLabel")}</Label>
            <Input
              id="building-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("codePlaceholder")}
              pattern="^B\d+$"
              title={t("codeHelp")}
              required
            />
            <p className="text-muted-foreground mt-1 text-xs">
              {t("codeHelp")}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {commonT("cancel")}
            </Button>
            <Button type="submit">{t("addBtn")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
