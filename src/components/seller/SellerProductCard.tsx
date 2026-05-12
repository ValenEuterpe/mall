"use client";

import React, { memo, useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  Check,
  Edit2,
  ImageOff,
  ImagePlus,
  Loader2,
  Package,
  Percent,
  ShoppingCart,
  Sparkles,
  Trash2,
  CalendarIcon,
  X,
} from "lucide-react";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/utils/toast";
import { apiClient } from "@/lib/api-client";
import { useSellerProductMutations } from "@/hooks/use-seller-product-mutations";
import type { SellerProductCardData, ProductDiscountData } from "@/types/product";
import { formatPrice, getStockStatus } from "@/types/product";

export interface SellerProductCardProps {
  product: SellerProductCardData;
  onImageAdd?: (files: File[]) => Promise<void>;
  onImageRemove?: (imageIndex: number) => void;
  onPriceChange?: (newPrice: number) => Promise<void>;
  onQuantityChange?: (newQuantity: number) => Promise<void>;
  onActiveToggle?: (isActive: boolean) => Promise<void>;
  onShowDetails?: () => void;
  onEdit?: () => void;
  className?: string;
}

interface EditableFieldProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  multiline?: boolean;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}

function EditableField({
  value,
  onSave,
  multiline = false,
  className,
  inputClassName,
  placeholder,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  const handleStartEdit = useCallback(() => {
    setEditValue(value);
    setIsEditing(true);
  }, [value]);

  const handleCancel = useCallback(() => {
    setEditValue(value);
    setIsEditing(false);
  }, [value]);

  const handleSave = useCallback(async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch {
      setEditValue(value);
    } finally {
      setIsSaving(false);
    }
  }, [editValue, value, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !multiline) {
        e.preventDefault();
        void handleSave();
      } else if (e.key === "Escape") {
        handleCancel();
      }
    },
    [handleSave, handleCancel, multiline]
  );

  if (isEditing) {
    const InputComponent = multiline ? Textarea : Input;
    return (
      <div className={cn("flex items-start gap-2", className)}>
        <InputComponent
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => void handleSave()}
          disabled={isSaving}
          className={cn("flex-1", inputClassName)}
          placeholder={placeholder}
          autoFocus
        />
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group hover:bg-muted/50 relative -mx-1 cursor-pointer rounded px-1 py-0.5",
        className
      )}
      onClick={handleStartEdit}
    >
      <span className={inputClassName}>{value || placeholder}</span>
      <Edit2 className="absolute top-1/2 right-0 h-3 w-3 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-50" />
    </div>
  );
}


interface ImageUploadButtonProps {
  onUpload: (files: File[]) => Promise<void>;
  disabled?: boolean;
  maxImages?: number;
  currentCount?: number;
}

function ImageUploadButton({
  onUpload,
  disabled,
  maxImages = 5,
  currentCount = 0,
}: ImageUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const t = useTranslations("sellerProduct");

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const remainingSlots = maxImages - currentCount;
      const filesToUpload = files.slice(0, remainingSlots);

      setIsUploading(true);
      try {
        await onUpload(filesToUpload);
      } finally {
        setIsUploading(false);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    },
    [onUpload, maxImages, currentCount]
  );

  const canAddMore = currentCount < maxImages;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void handleFileChange(e)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-16 w-16 border-dashed"
        onClick={handleClick}
        disabled={disabled || isUploading || !canAddMore}
      >
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <ImagePlus className="h-5 w-5" />
        )}
      </Button>
      {currentCount >= maxImages && (
        <p className="text-muted-foreground mt-1 text-xs">
          {t("maxImagesReached")}
        </p>
      )}
    </>
  );
}

export const SellerProductCard = memo(function SellerProductCard({
  product,
  onImageAdd,
  onImageRemove,
  onPriceChange,
  onQuantityChange,
  onActiveToggle,
  onShowDetails,
  onEdit,
  className,
}: SellerProductCardProps) {
  const t = useTranslations("sellerProduct");
  const locale = useLocale();

  const [localImages, setLocalImages] = useState<string[]>(product.images);
  const [localPrice, setLocalPrice] = useState(product.basePrice);
  const [localQuantity, setLocalQuantity] = useState(product.stockQuantity);
  const [localIsActive, setLocalIsActive] = useState(product.isActive);
  const [localStatus, setLocalStatus] = useState(product.status);
  const [localDiscounts, setLocalDiscounts] = useState<ProductDiscountData[]>(product.discounts || []);
  const [salePopoverOpen, setSalePopoverOpen] = useState(false);
  const [saleForm, setSaleForm] = useState({
    name_en: "",
    name_ru: "",
    name_am: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: "",
    startDate: null as Date | null,
    endDate: null as Date | null,
    autoTranslate: false,
  });
  const [isSavingSale, setIsSavingSale] = useState(false);
  const [saleLangTab, setSaleLangTab] = useState<"en" | "ru" | "am">("en");
  const [isTranslatingSale, setIsTranslatingSale] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const stockStatus = getStockStatus(localQuantity);
  const activeDiscounts = localDiscounts.filter((d) => d.isActive);

  const mutations = useSellerProductMutations({ productId: product.id });

  const handleDefaultImageAdd = useCallback(
    async (files: File[]) => {
      try {
        const urls: string[] = [];
        for (const file of files) {
          const res = await apiClient.upload<{ url: string }>("/upload", file);
          if (res.success && res.data?.url) {
            urls.push(res.data.url);
          }
        }
        if (urls.length > 0) {
          const newImages = [...localImages, ...urls].slice(0, 5);
          setLocalImages(newImages);
          await mutations.updateImages(newImages);
          onImageAdd?.(files);
        }
      } catch {
        toast.error(t("imageAddFailed"));
      }
    },
    [localImages, mutations, onImageAdd, t]
  );

  const handleDefaultImageRemove = useCallback(
    async (index: number) => {
      try {
        const newImages = localImages.filter((_, i) => i !== index);
        setLocalImages(newImages);
        await mutations.updateImages(newImages);
        onImageRemove?.(index);
      } catch {
        toast.error(t("imageRemoveFailed"));
      }
    },
    [localImages, mutations, onImageRemove, t]
  );

  const handleDefaultPriceChange = useCallback(
    async (newPrice: number) => {
      setLocalPrice(newPrice);
      await mutations.updatePrice(newPrice);
      onPriceChange?.(newPrice);
    },
    [mutations, onPriceChange]
  );

  const handleDefaultQuantityChange = useCallback(
    async (newQuantity: number) => {
      setLocalQuantity(newQuantity);
      await mutations.updateQuantity(newQuantity);
      onQuantityChange?.(newQuantity);
    },
    [mutations, onQuantityChange]
  );

  const handleDefaultActiveToggle = useCallback(
    async (newIsActive: boolean) => {
      setLocalIsActive(newIsActive);
      await mutations.updateActive(newIsActive);
      onActiveToggle?.(newIsActive);
    },
    [mutations, onActiveToggle]
  );

  const handleStatusToggle = useCallback(
    async (published: boolean) => {
      const newStatus = published ? "PUBLISHED" : "DRAFT";
      setLocalStatus(newStatus);
      await mutations.updateStatus(newStatus);
    },
    [mutations]
  );

  const handleCreateDiscount = useCallback(async () => {
    const value = parseFloat(saleForm.discountValue);
    if (isNaN(value) || value <= 0) return;
    if (saleForm.discountType === "percentage" && value > 100) return;

    setIsSavingSale(true);
    try {
      const name = saleForm.name_en || saleForm.name_ru || saleForm.name_am || "";
      const created = await mutations.createDiscount({
        name,
        name_en: saleForm.name_en || undefined,
        name_ru: saleForm.name_ru || undefined,
        name_am: saleForm.name_am || undefined,
        discountType: saleForm.discountType,
        discountValue: value,
        startDate: saleForm.startDate?.toISOString() ?? undefined,
        endDate: saleForm.endDate?.toISOString() ?? undefined,
        autoTranslate: saleForm.autoTranslate,
        isActive: true,
      });
      setLocalDiscounts((prev) => [...prev, created]);
      setSaleForm({
        name_en: "", name_ru: "", name_am: "",
        discountType: "percentage", discountValue: "",
        startDate: null, endDate: null, autoTranslate: false,
      });
      setSalePopoverOpen(false);
    } catch {
      // toast already shown by hook
    } finally {
      setIsSavingSale(false);
    }
  }, [saleForm, mutations]);

  const handleDeleteDiscount = useCallback(
    async (discountId: string) => {
      try {
        await mutations.deleteDiscount(discountId);
        setLocalDiscounts((prev) => prev.filter((d) => d.id !== discountId));
      } catch {
        // toast already shown by hook
      }
    },
    [mutations]
  );

  const handleNameSave = useCallback(
    async (newName: string) => {
      await mutations.updateName(newName);
    },
    [mutations]
  );

  const handleDescriptionSave = useCallback(
    async (newDescription: string) => {
      await mutations.updateDescription(newDescription);
    },
    [mutations]
  );

  const formattedPrice = useMemo(
    () => formatPrice(localPrice, locale),
    [localPrice, locale]
  );

  const getStatusBadge = useCallback(() => {
    if (!localIsActive) {
      return <Badge variant="secondary">{t("status.inactive")}</Badge>;
    }
    switch (localStatus) {
      case "PUBLISHED":
        return (
          <Badge variant="default" className="bg-green-600">
            {t("status.published")}
          </Badge>
        );
      case "DRAFT":
        return <Badge variant="outline">{t("status.draft")}</Badge>;
      case "OUT_OF_STOCK":
        return <Badge variant="destructive">{t("status.outOfStock")}</Badge>;
      default:
        return <Badge variant="secondary">{localStatus}</Badge>;
    }
  }, [localStatus, localIsActive, t]);

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all hover:shadow-md",
        className
      )}
    >
      <div className="flex gap-2 overflow-x-auto p-3">
        {localImages.map((img, idx) => (
          <div
            key={idx}
            className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md"
          >
            {img ? (
              <Image
                src={img}
                alt={`${product.name} ${idx + 1}`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="bg-muted flex h-full items-center justify-center">
                <ImageOff className="text-muted-foreground h-6 w-6" />
              </div>
            )}
            <Button
              size="icon"
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5"
              onClick={() => void handleDefaultImageRemove(idx)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {localImages.length < 5 && (
          <ImageUploadButton
            onUpload={handleDefaultImageAdd}
            maxImages={5}
            currentCount={localImages.length}
          />
        )}
      </div>

      <CardContent className="space-y-3 p-4 pt-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <EditableField
              value={product.name}
              onSave={handleNameSave}
              inputClassName="font-semibold line-clamp-2"
              placeholder={t("unnamedProduct")}
            />
          </div>
          {getStatusBadge()}
        </div>

        <EditableField
          value={product.description || ""}
          onSave={handleDescriptionSave}
          multiline
          inputClassName="text-sm text-muted-foreground line-clamp-2"
          placeholder={t("noDescription")}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {t("quantity")}
            </span>
            <span className="text-sm font-medium">{localQuantity}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => {
                      const newQty = prompt(
                        t("enterQuantity"),
                        String(localQuantity)
                      );
                      if (newQty !== null && !isNaN(parseInt(newQty)) && parseInt(newQty) >= 0) {
                        void handleDefaultQuantityChange(parseInt(newQty));
                      }
                    }}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("enterQuantity")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{formattedPrice}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => {
                      const newPrice = prompt(
                        t("enterPrice"),
                        String(localPrice)
                      );
                      if (newPrice && !isNaN(parseFloat(newPrice))) {
                        void handleDefaultPriceChange(parseFloat(newPrice));
                      }
                    }}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("editPrice")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Active discounts display */}
        {activeDiscounts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activeDiscounts.map((d) => {
              const localeName = locale === "ru" ? d.name_ru : locale === "am" ? d.name_am : d.name_en;
              const displayName = localeName || d.name;
              return (
                <Badge key={d.id} variant="secondary" className="gap-1 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  <Percent className="h-3 w-3" />
                  {displayName ? `${displayName}: ` : ""}
                  {d.discountType === "percentage" ? `-${d.discountValue}%` : `-${formatPrice(d.discountValue, locale)}`}
                  <button
                    className="ml-0.5 hover:text-red-900"
                    onClick={() => void handleDeleteDiscount(d.id)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Popover open={salePopoverOpen} onOpenChange={setSalePopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                  {t("addSale")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 space-y-3" align="start">
                {/* Language tabs for sale name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t("saleName")}</Label>
                  <Tabs value={saleLangTab} onValueChange={(v) => setSaleLangTab(v as "en" | "ru" | "am")}>
                    <TabsList className="grid w-full grid-cols-3 h-7">
                      <TabsTrigger value="en" className="text-xs py-0.5">EN</TabsTrigger>
                      <TabsTrigger value="ru" className="text-xs py-0.5">RU</TabsTrigger>
                      <TabsTrigger value="am" className="text-xs py-0.5">AM</TabsTrigger>
                    </TabsList>
                    <TabsContent value="en" className="mt-1.5">
                      <Input
                        value={saleForm.name_en}
                        onChange={(e) => setSaleForm((prev) => ({ ...prev, name_en: e.target.value }))}
                        placeholder={t("saleNamePlaceholder")}
                        className="h-8 text-sm"
                      />
                    </TabsContent>
                    <TabsContent value="ru" className="mt-1.5">
                      <Input
                        value={saleForm.name_ru}
                        onChange={(e) => setSaleForm((prev) => ({ ...prev, name_ru: e.target.value }))}
                        placeholder={t("saleNamePlaceholder")}
                        className="h-8 text-sm"
                      />
                    </TabsContent>
                    <TabsContent value="am" className="mt-1.5">
                      <Input
                        value={saleForm.name_am}
                        onChange={(e) => setSaleForm((prev) => ({ ...prev, name_am: e.target.value }))}
                        placeholder={t("saleNamePlaceholder")}
                        className="h-8 text-sm"
                      />
                    </TabsContent>
                  </Tabs>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="sale-auto-translate"
                      checked={saleForm.autoTranslate}
                      onCheckedChange={(v) => setSaleForm((prev) => ({ ...prev, autoTranslate: !!v }))}
                    />
                    <label htmlFor="sale-auto-translate" className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
                      <Sparkles className="h-3 w-3" />
                      {t("autoTranslateSale")}
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t("discountType")}</Label>
                    <Select
                      value={saleForm.discountType}
                      onValueChange={(v) => setSaleForm((prev) => ({ ...prev, discountType: v as "percentage" | "fixed" }))}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">{t("percentage")}</SelectItem>
                        <SelectItem value="fixed">{t("fixedAmount")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t("discountValue")}</Label>
                    <Input
                      type="number"
                      min="0"
                      max={saleForm.discountType === "percentage" ? "100" : undefined}
                      step="0.01"
                      value={saleForm.discountValue}
                      onChange={(e) => setSaleForm((prev) => ({ ...prev, discountValue: e.target.value }))}
                      placeholder={saleForm.discountType === "percentage" ? "10" : "500"}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                {/* Date pickers */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t("startDate")}</Label>
                    <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full h-8 text-xs justify-start font-normal">
                          <CalendarIcon className="mr-1.5 h-3 w-3" />
                          {saleForm.startDate ? format(saleForm.startDate, "MMM d, yyyy") : <span className="text-muted-foreground">Optional</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={saleForm.startDate ?? undefined}
                          onSelect={(date) => {
                            setSaleForm((prev) => ({ ...prev, startDate: date ?? null }));
                            setStartDateOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t("endDate")}</Label>
                    <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full h-8 text-xs justify-start font-normal">
                          <CalendarIcon className="mr-1.5 h-3 w-3" />
                          {saleForm.endDate ? format(saleForm.endDate, "MMM d, yyyy") : <span className="text-muted-foreground">Optional</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={saleForm.endDate ?? undefined}
                          onSelect={(date) => {
                            setSaleForm((prev) => ({ ...prev, endDate: date ?? null }));
                            setEndDateOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={isSavingSale || !saleForm.discountValue}
                    onClick={() => void handleCreateDiscount()}
                  >
                    {isSavingSale ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("saveSale")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSalePopoverOpen(false)}
                  >
                    {t("cancelSale")}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">{localStatus === "PUBLISHED" ? t("status.published") : t("status.draft")}</span>
              <Switch
                checked={localStatus === "PUBLISHED"}
                onCheckedChange={(v) => void handleStatusToggle(v)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">{t("active")}</span>
              <Switch
                checked={localIsActive}
                onCheckedChange={(v) => void handleDefaultActiveToggle(v)}
              />
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="gap-2 p-4 pt-0">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onShowDetails}
        >
          <Package className="mr-1.5 h-4 w-4" />
          {t("showDetails")}
        </Button>
        {onEdit && (
          <Button size="sm" className="flex-1" onClick={onEdit}>
            <Edit2 className="mr-1.5 h-4 w-4" />
            {t("edit")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
});

export function SellerProductCardSkeleton({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex gap-2 p-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-16 rounded-md" />
        ))}
      </div>
      <CardContent className="space-y-3 p-4">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-4 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </CardContent>
      <CardFooter className="gap-2 p-4">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 flex-1" />
      </CardFooter>
    </Card>
  );
}

export default SellerProductCard;
