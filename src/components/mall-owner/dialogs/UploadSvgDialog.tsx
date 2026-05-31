"use client";

import { useTranslations } from "next-intl";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ParsedShopId {
  id: string;
  venue?: number;
  building?: number;
  floor?: number;
  shop: number;
}

interface Floor {
  id: string;
  number: number;
  label?: string | null;
  code: string;
  floorMap: { id: string; svgUrl: string; shopIds: string[] } | null;
}

interface UploadSvgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  svgFile: File | null;
  parsedShopIds: ParsedShopId[];
  uploading: boolean;
  isBuilding: boolean;
  selectedFloor: Floor | null;
  onFloorChange: (floor: Floor | null) => void;
  existingFloors: Floor[];
}

export function UploadSvgDialog({
  open,
  onOpenChange,
  onFileChange,
  onUpload,
  svgFile,
  parsedShopIds,
  uploading,
  isBuilding,
  selectedFloor,
  onFloorChange,
  existingFloors,
}: UploadSvgDialogProps) {
  const t = useTranslations("mapEditor.dialogs.uploadSvg");
  const commonT = useTranslations("common");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isBuilding && (
            <div>
              <Label>{t("floorLabel")}</Label>
              {existingFloors.length === 0 ? (
                <p className="text-muted-foreground mt-1 text-sm">
                  {t("noFloors")}
                </p>
              ) : (
                <Select
                  value={selectedFloor?.id ?? ""}
                  onValueChange={(v) => {
                    const floor = existingFloors.find((f) => f.id === v);
                    onFloorChange(floor || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("floorPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {existingFloors.map((floor) => (
                      <SelectItem key={floor.id} value={floor.id}>
                        {floor.code}
                        {floor.label && ` (${floor.label})`}
                        {floor.floorMap && ` - ${t("hasMap")}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="svg-file">{t("fileLabel")}</Label>
            <Input
              id="svg-file"
              type="file"
              accept=".svg"
              onChange={onFileChange}
              className="cursor-pointer"
            />
          </div>

          {svgFile && (
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm font-medium">{svgFile.name}</p>
              <p className="text-muted-foreground text-xs">
                {(svgFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          )}

          {parsedShopIds.length > 0 && (
            <div className="space-y-2">
              <Label>{t("foundShops", { count: parsedShopIds.length })}</Label>
              <div className="max-h-40 overflow-y-auto rounded-lg border p-2">
                <div className="flex flex-wrap gap-1">
                  {parsedShopIds.slice(0, 50).map((shop) => (
                    <Badge
                      key={shop.id}
                      variant="secondary"
                      className="text-xs"
                    >
                      {shop.id}
                    </Badge>
                  ))}
                  {parsedShopIds.length > 50 && (
                    <Badge variant="outline" className="text-xs">
                      {t("moreShops", { count: parsedShopIds.length - 50 })}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {commonT("cancel")}
          </Button>
          <Button
            onClick={onUpload}
            disabled={
              !svgFile || uploading || (isBuilding && selectedFloor === null)
            }
          >
            {uploading ? t("uploading") : t("uploadBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
