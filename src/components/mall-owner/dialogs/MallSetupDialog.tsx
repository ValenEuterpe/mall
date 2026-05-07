"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
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
} from "@/components/ui/dialog";

// Dynamically import the location picker map to avoid SSR issues with Leaflet
const LocationPickerMap = dynamic(() => import("./LocationPickerMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] bg-muted rounded-lg flex items-center justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
    </div>
  ),
});

// Yerevan, Armenia coordinates
const YEREVAN_CENTER: [number, number] = [40.1872, 44.5152];

interface MallSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, lat: number, lng: number, address?: string) => void;
  defaultCenter?: [number, number];
}

export function MallSetupDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultCenter = YEREVAN_CENTER,
}: MallSetupDialogProps) {
  const t = useTranslations("mapEditor.dialogs.mallSetup");
  const commonT = useTranslations("common");
  
  const [name, setName] = useState("");
  const [position, setPosition] = useState<{ lat: number; lng: number }>({
    lat: defaultCenter[0],
    lng: defaultCenter[1],
  });
  const [address, setAddress] = useState("");

  // Reset position when dialog opens with new defaultCenter
  useEffect(() => {
    if (open) {
      setPosition({ lat: defaultCenter[0], lng: defaultCenter[1] });
    }
  }, [open, defaultCenter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(name, position.lat, position.lng, address || undefined);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="mall-name">{t("nameLabel")}</Label>
            <Input
              id="mall-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              required
            />
          </div>
          
          <div>
            <Label>{t("locationLabel")}</Label>
            <p className="text-sm text-muted-foreground mb-2">
              {t("locationHelp")}
            </p>
            <div className="rounded-lg overflow-hidden border">
              <LocationPickerMap
                position={position}
                onPositionChange={setPosition}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("selectedCoords", { lat: position.lat.toFixed(6), lng: position.lng.toFixed(6) })}
            </p>
          </div>

          <div>
            <Label htmlFor="address">{t("addressLabel")}</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("addressPlaceholder")}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleCancel}>
              {commonT("cancel")}
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {commonT("confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
