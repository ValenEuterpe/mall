"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useCategories } from "@/hooks/use-categories";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/utils/toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  CalendarIcon,
  Globe,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Tag as TagIcon,
  Trash2,
  X,
} from "lucide-react";
import { CreateTagDialog } from "@/components/seller/CreateTagDialog";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link } from "@/i18n/routing";

// ============================================================================
// Types
// ============================================================================

export interface ProductFormData {
  name: string;
  name_en: string;
  name_ru: string;
  name_am: string;
  description: string;
  description_en: string;
  description_ru: string;
  description_am: string;
  price: string;
  stockQuantity: string;
  sku: string;
  barcode: string;
  categoryId: string;
  subcategoryId: string;
  tagIds: string[];
  isActive: boolean;
  status: "DRAFT" | "PUBLISHED";
  images: string[];
}

interface ProductFormProps {
  mode: "create" | "edit";
  initialData?: Partial<ProductFormData>;
  productId?: string;
  onSuccess?: () => void;
  onClose?: () => void;
  onDelete?: () => void;
  embedded?: boolean;
}

const EMPTY_FORM: ProductFormData = {
  name: "",
  name_en: "",
  name_ru: "",
  name_am: "",
  description: "",
  description_en: "",
  description_ru: "",
  description_am: "",
  price: "",
  stockQuantity: "",
  sku: "",
  barcode: "",
  categoryId: "",
  subcategoryId: "",
  tagIds: [],
  isActive: true,
  status: "DRAFT",
  images: [],
};

// ============================================================================
// Component
// ============================================================================

export function ProductForm({
  mode,
  initialData,
  productId,
  onSuccess,
  onClose,
  onDelete,
  embedded,
}: ProductFormProps) {
  const t = useTranslations("seller.productForm");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const { categories, isLoading: categoriesLoading } = useCategories({
    includeEmpty: true,
  });

  const [formData, setFormData] = useState<ProductFormData>(() => ({
    ...EMPTY_FORM,
    ...initialData,
  }));
  const [availableTags, setAvailableTags] = useState<
    Array<{
      id: string;
      name_en: string;
      name_ru?: string;
      name_am?: string | null;
      key: string;
    }>
  >([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [createTagOpen, setCreateTagOpen] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ProductFormData, string>>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTranslationTab, setActiveTranslationTab] = useState<
    "en" | "ru" | "am"
  >("en");

  // Fetch tags when category or subcategory changes.
  // Subcategory-scoped fetch returns: tags for the subcategory + category-level tags (no subcategory).
  useEffect(() => {
    const fetchTags = async () => {
      if (!formData.categoryId) {
        setAvailableTags([]);
        return;
      }
      setTagsLoading(true);
      try {
        const qs = new URLSearchParams({ categoryId: formData.categoryId });
        if (formData.subcategoryId)
          qs.set("subcategoryId", formData.subcategoryId);
        const res = await apiClient.get<any[]>(`/tags?${qs.toString()}`);
        if (res.success) {
          setAvailableTags(res.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch tags", err);
      } finally {
        setTagsLoading(false);
      }
    };
    void fetchTags();
  }, [formData.categoryId, formData.subcategoryId]);

  // Get subcategories for selected category
  const selectedCategory = categories.find((c) => c.id === formData.categoryId);
  const subcategories = selectedCategory?.subcategories || [];

  // Reset subcategory when category changes
  useEffect(() => {
    if (formData.subcategoryId && selectedCategory) {
      const subcatExists = subcategories.some(
        (s) => s.id === formData.subcategoryId
      );
      if (!subcatExists) {
        setFormData((prev) => ({ ...prev, subcategoryId: "" }));
      }
    }
  }, [
    formData.categoryId,
    formData.subcategoryId,
    selectedCategory,
    subcategories,
  ]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleChange = <K extends keyof ProductFormData>(
    field: K,
    value: ProductFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleInputChange =
    (field: keyof ProductFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      handleChange(field, e.target.value);
    };

  const validateForm = (): Partial<Record<keyof ProductFormData, string>> => {
    const newErrors: Partial<Record<keyof ProductFormData, string>> = {};

    // Name is required (at least one language)
    if (
      !formData.name &&
      !formData.name_en &&
      !formData.name_ru &&
      !formData.name_am
    ) {
      newErrors.name = t("validation.nameRequired");
    }

    // Price validation
    if (!formData.price) {
      newErrors.price = t("validation.priceRequired");
    } else if (
      isNaN(parseFloat(formData.price)) ||
      parseFloat(formData.price) < 0
    ) {
      newErrors.price = t("validation.pricePositive");
    }

    // Stock validation (optional - only validate format if provided)
    if (
      formData.stockQuantity &&
      (isNaN(parseInt(formData.stockQuantity)) ||
        parseInt(formData.stockQuantity) < 0)
    ) {
      newErrors.stockQuantity = t("validation.stockPositive");
    }

    // Category is required
    if (!formData.categoryId) {
      newErrors.categoryId = t("validation.categoryRequired");
    }

    setErrors(newErrors);
    return newErrors;
  };

  const handleTranslate = async () => {
    const sourceName =
      formData.name || formData.name_en || formData.name_ru || formData.name_am;
    const sourceDesc =
      formData.description ||
      formData.description_en ||
      formData.description_ru ||
      formData.description_am;

    if (!sourceName && !sourceDesc) {
      toast.error("Please enter product name or description to translate");
      return;
    }

    setIsTranslating(true);
    try {
      type FieldTranslations = {
        en: string;
        ru: string;
        am: string;
        detectedLanguage: string;
      };
      type ProductTranslateResponse = {
        type: "product";
        name?: FieldTranslations;
        description?: FieldTranslations;
        detailDescription?: FieldTranslations;
      };

      const response = await apiClient.post<ProductTranslateResponse>(
        "/translate",
        {
          type: "product",
          ...(sourceName ? { name: sourceName } : {}),
          ...(sourceDesc ? { description: sourceDesc } : {}),
        }
      );

      if (response.success && response.data) {
        const { name, description } = response.data;
        setFormData((prev) => ({
          ...prev,
          name_en: name?.en || prev.name_en,
          name_ru: name?.ru || prev.name_ru,
          name_am: name?.am || prev.name_am,
          description_en: description?.en || prev.description_en,
          description_ru: description?.ru || prev.description_ru,
          description_am: description?.am || prev.description_am,
        }));
        toast.success(t("translateSuccess"));
      } else {
        toast.error(t("translateError"));
      }
    } catch (error) {
      console.error("Translation failed:", error);
      toast.error(t("translateError"));
    } finally {
      setIsTranslating(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = 5 - formData.images.length;
    if (remaining <= 0) {
      toast.error(t("imagesMax"));
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);
    setIsUploading(true);

    try {
      for (const file of filesToUpload) {
        const response = await apiClient.upload<{ url: string }>(
          "/upload",
          file
        );
        if (response.success && response.data?.url) {
          const url = response.data.url;
          setFormData((prev) => ({
            ...prev,
            images: [...prev.images, url],
          }));
        }
      }
    } catch (error) {
      console.error("Image upload failed:", error);
      toast.error(t("imageUploadError"));
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be re-selected
      e.target.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      const errorMessages = Object.values(validationErrors).join(", ");
      toast.error(errorMessages);
      // Scroll to the first field with an error
      setTimeout(() => {
        const firstError = document.querySelector("[data-field-error]");
        if (firstError) {
          firstError.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name:
          formData.name ||
          formData.name_en ||
          formData.name_ru ||
          formData.name_am,
        name_en: formData.name_en || undefined,
        name_ru: formData.name_ru || undefined,
        name_am: formData.name_am || undefined,
        description:
          formData.description || formData.description_en || undefined,
        description_en: formData.description_en || undefined,
        description_ru: formData.description_ru || undefined,
        description_am: formData.description_am || undefined,
        basePrice: parseFloat(formData.price),
        stockQuantity: formData.stockQuantity
          ? parseInt(formData.stockQuantity)
          : 0,
        sku: formData.sku || undefined,
        barcode: formData.barcode || undefined,
        categoryId: formData.categoryId || undefined,
        subcategoryId: formData.subcategoryId || undefined,
        tagIds: formData.tagIds,
        autoTranslate: true, // Always enable for AI tagging/translation fallback
        status: formData.status,
        isActive: formData.isActive,
        images: formData.images.length > 0 ? formData.images : undefined,
      };

      if (mode === "create") {
        await apiClient.post("/sellers/products", payload);
      } else if (productId) {
        await apiClient.put(`/sellers/products/${productId}`, payload);
      }

      toast.success(t("saveSuccess"));
      onSuccess?.();
      if (!embedded) {
        router.push("/seller/products");
      }
    } catch (error) {
      console.error("Failed to save product:", error);
      toast.error(t("saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      className={cn(
        "relative container mx-auto max-w-5xl px-4 py-8",
        embedded && "px-2 py-4"
      )}
    >
      {!embedded && (
        <div className="bg-background/90 animate-in fade-in slide-in-from-top-4 sticky top-0 z-50 -mx-4 mb-8 border-b px-4 py-5 shadow-sm backdrop-blur-md duration-500">
          <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                asChild
                className="hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Link href="/seller/products">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("back")}
                </Link>
              </Button>
              <div>
                <h1 className="from-primary to-primary/60 bg-gradient-to-r bg-clip-text text-2xl font-bold tracking-tight text-transparent">
                  {mode === "create" ? t("createTitle") : t("editTitle")}
                </h1>
                <p className="text-muted-foreground hidden text-xs font-medium sm:block">
                  {mode === "create" ? t("createDesc") : t("editDesc")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/seller/products")}
                className="h-10 px-6 font-semibold"
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                form="product-form"
                disabled={isSaving}
                className="shadow-primary/20 hover:shadow-primary/30 h-10 gap-2 px-8 font-bold shadow-lg transition-all"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? t("saving") : t("save")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {embedded && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            {mode === "edit" && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                disabled={isSaving}
                className="h-10 gap-2 px-6 font-semibold"
              >
                <Trash2 className="h-4 w-4" />
                {tCommon("delete")}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 px-6 font-semibold"
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              form="product-form"
              disabled={isSaving}
              className="shadow-primary/20 hover:shadow-primary/30 h-10 gap-2 px-8 font-bold shadow-lg transition-all"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? t("saving") : t("save")}
            </Button>
          </div>
        </div>
      )}

      <form
        id="product-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-8 lg:grid-cols-3"
      >
        {/* Main Content (Left Column) */}
        <div className="space-y-8 lg:col-span-2">
          {/* Basic Information */}
          <Card className="overflow-hidden border-none bg-white/50 shadow-md backdrop-blur-sm">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Badge
                  variant="outline"
                  className="bg-primary shadow-primary/20 flex h-6 w-6 items-center justify-center rounded-full border-none p-0 text-white shadow-sm"
                >
                  1
                </Badge>
                {t("basicInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Primary Name */}
              <div className="space-y-2.5">
                <Label htmlFor="name" className="text-base font-semibold">
                  {t("name")}{" "}
                  <span className="text-destructive font-bold">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange("name")}
                  placeholder={t("namePlaceholder")}
                  className={cn(
                    "h-11 transition-all focus:ring-2",
                    errors.name && "border-destructive ring-destructive/20"
                  )}
                />
                {errors.name && (
                  <p
                    data-field-error
                    className="text-destructive text-sm font-medium"
                  >
                    {errors.name}
                  </p>
                )}
                <p className="text-muted-foreground px-1 text-xs italic">
                  {t("nameHelp")}
                </p>
              </div>

              {/* Primary Description */}
              <div className="space-y-2.5 pt-2">
                <Label
                  htmlFor="description"
                  className="text-base font-semibold"
                >
                  {t("description")}
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={handleInputChange("description")}
                  placeholder={t("descriptionPlaceholder")}
                  rows={6}
                  className="min-h-[150px] resize-none transition-all focus:ring-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Translations */}
          <Card className="overflow-hidden border-none bg-white/50 shadow-md backdrop-blur-sm">
            <CardHeader className="bg-muted/30 flex flex-row items-center justify-between border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Badge
                  variant="outline"
                  className="bg-primary shadow-primary/20 flex h-6 w-6 items-center justify-center rounded-full border-none p-0 text-white shadow-sm"
                >
                  2
                </Badge>
                <Globe className="text-primary h-5 w-5 animate-pulse" />
                {t("translations")}
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTranslate}
                disabled={isTranslating}
                className="hover:bg-primary/5 hover:text-primary border-primary/20 h-9 rounded-full transition-colors"
              >
                {isTranslating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="text-primary mr-2 h-4 w-4" />
                )}
                {isTranslating ? t("translating") : t("translate")}
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs
                value={activeTranslationTab}
                onValueChange={(v) =>
                  setActiveTranslationTab(v as "en" | "ru" | "am")
                }
              >
                <TabsList className="bg-muted/50 mb-6 grid w-full grid-cols-3 rounded-xl p-1">
                  <TabsTrigger
                    value="en"
                    className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <span className="mr-2">🇬🇧</span> {t("english")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="ru"
                    className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <span className="mr-2">🇷🇺</span> {t("russian")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="am"
                    className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <span className="mr-2">🇦🇲</span> {t("armenian")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="en"
                  className="animate-in fade-in space-y-5 duration-300"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name_en" className="text-sm font-semibold">
                      {t("name")} (English)
                    </Label>
                    <Input
                      id="name_en"
                      value={formData.name_en}
                      onChange={handleInputChange("name_en")}
                      placeholder="Product name in English"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="description_en"
                      className="text-sm font-semibold"
                    >
                      {t("description")} (English)
                    </Label>
                    <Textarea
                      id="description_en"
                      value={formData.description_en}
                      onChange={handleInputChange("description_en")}
                      placeholder="Description in English"
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                </TabsContent>

                <TabsContent
                  value="ru"
                  className="animate-in fade-in space-y-5 duration-300"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name_ru" className="text-sm font-semibold">
                      {t("name")} (Русский)
                    </Label>
                    <Input
                      id="name_ru"
                      value={formData.name_ru}
                      onChange={handleInputChange("name_ru")}
                      placeholder="Название товара на русском"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="description_ru"
                      className="text-sm font-semibold"
                    >
                      {t("description")} (Русский)
                    </Label>
                    <Textarea
                      id="description_ru"
                      value={formData.description_ru}
                      onChange={handleInputChange("description_ru")}
                      placeholder="Описание на русском"
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                </TabsContent>

                <TabsContent
                  value="am"
                  className="animate-in fade-in space-y-5 duration-300"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name_am" className="text-sm font-semibold">
                      {t("name")} (Հայերեն)
                    </Label>
                    <Input
                      id="name_am"
                      value={formData.name_am}
                      onChange={handleInputChange("name_am")}
                      placeholder="Ապրանքի անունը հայերեն"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="description_am"
                      className="text-sm font-semibold"
                    >
                      {t("description")} (Հայերեն)
                    </Label>
                    <Textarea
                      id="description_am"
                      value={formData.description_am}
                      onChange={handleInputChange("description_am")}
                      placeholder="Նկարագրությունը հայերեն"
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Actions (Right Column) */}
        <div className="space-y-8">
          {/* Pricing & Stock Card */}
          <Card className="overflow-hidden border-none bg-white/50 shadow-md backdrop-blur-sm">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Badge
                  variant="outline"
                  className="bg-primary shadow-primary/20 flex h-6 w-6 items-center justify-center rounded-full border-none p-0 text-white shadow-sm"
                >
                  3
                </Badge>
                {t("pricing")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Price */}
              <div className="space-y-2">
                <Label htmlFor="price" className="text-sm font-semibold">
                  {t("price")} <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={handleInputChange("price")}
                    placeholder="0.00"
                    className={cn(
                      "h-11 pr-16",
                      errors.price && "border-destructive"
                    )}
                  />
                  <div className="bg-muted/30 absolute top-0 right-0 flex h-full items-center rounded-r-md border-l px-3 text-sm font-bold">
                    {t("currency")}
                  </div>
                </div>
                {errors.price && (
                  <p data-field-error className="text-destructive text-sm">
                    {errors.price}
                  </p>
                )}
              </div>

              {/* Stock */}
              <div className="space-y-2">
                <Label
                  htmlFor="stockQuantity"
                  className="text-sm font-semibold"
                >
                  {t("stock")}
                </Label>
                <Input
                  id="stockQuantity"
                  type="number"
                  min="0"
                  value={formData.stockQuantity}
                  onChange={handleInputChange("stockQuantity")}
                  placeholder="0"
                  className={cn(
                    "h-11",
                    errors.stockQuantity && "border-destructive"
                  )}
                />
                {errors.stockQuantity && (
                  <p data-field-error className="text-destructive text-sm">
                    {errors.stockQuantity}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Product Identifiers Card */}
          <Card className="overflow-hidden border-none bg-white/50 shadow-md backdrop-blur-sm">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Badge
                  variant="outline"
                  className="bg-primary shadow-primary/20 flex h-6 w-6 items-center justify-center rounded-full border-none p-0 text-white shadow-sm"
                >
                  4
                </Badge>
                {t("identifiers")}
              </CardTitle>
              <CardDescription>{t("identifiersHelp")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sku" className="text-sm font-semibold">
                    {t("sku")}
                  </Label>
                  <Input
                    id="sku"
                    placeholder={t("skuPlaceholder")}
                    value={formData.sku}
                    onChange={handleInputChange("sku")}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode" className="text-sm font-semibold">
                    {t("barcode")}
                  </Label>
                  <Input
                    id="barcode"
                    placeholder={t("barcodePlaceholder")}
                    value={formData.barcode}
                    onChange={handleInputChange("barcode")}
                    className="h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Card */}
          <Card className="overflow-hidden border-none bg-white/50 shadow-md backdrop-blur-sm">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Badge
                  variant="outline"
                  className="bg-primary shadow-primary/20 flex h-6 w-6 items-center justify-center rounded-full border-none p-0 text-white shadow-sm"
                >
                  5
                </Badge>
                {t("category")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  {t("category")} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => handleChange("categoryId", value)}
                  disabled={categoriesLoading}
                >
                  <SelectTrigger
                    className={cn(
                      "h-11",
                      errors.categoryId && "border-destructive"
                    )}
                  >
                    <SelectValue placeholder={t("categoryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoryId && (
                  <p data-field-error className="text-destructive text-sm">
                    {errors.categoryId}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  {t("subcategory")}
                </Label>
                <Select
                  value={formData.subcategoryId}
                  onValueChange={(value) =>
                    handleChange("subcategoryId", value)
                  }
                  disabled={!formData.categoryId || subcategories.length === 0}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={t("subcategoryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories.map((subcategory) => (
                      <SelectItem key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tags Card */}
          <Card className="overflow-hidden border-none bg-white/50 shadow-md backdrop-blur-sm">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Badge
                  variant="outline"
                  className="bg-primary shadow-primary/20 flex h-6 w-6 items-center justify-center rounded-full border-none p-0 text-white shadow-sm"
                >
                  6
                </Badge>
                <TagIcon className="text-primary h-5 w-5" />
                {t("tags")}
              </CardTitle>
              <CardDescription>{t("tagsHelp")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {!formData.categoryId ? (
                <p className="text-muted-foreground text-sm italic">
                  {t("selectCategoryForTags")}
                </p>
              ) : tagsLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{t("loadingTags")}</span>
                </div>
              ) : availableTags.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("noTagsInCategory")}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={
                        formData.tagIds.includes(tag.id) ? "default" : "outline"
                      }
                      className={cn(
                        "cursor-pointer px-3 py-1.5 transition-all hover:scale-105",
                        formData.tagIds.includes(tag.id)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted"
                      )}
                      onClick={() => {
                        const newTagIds = formData.tagIds.includes(tag.id)
                          ? formData.tagIds.filter((id) => id !== tag.id)
                          : [...formData.tagIds, tag.id];
                        handleChange("tagIds", newTagIds);
                      }}
                    >
                      {tag.name_en}
                    </Badge>
                  ))}
                  <Badge
                    variant="outline"
                    className="text-primary hover:bg-primary/10 cursor-pointer border-dashed px-3 py-1.5 transition-all hover:scale-105"
                    onClick={() => setCreateTagOpen(true)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    {t("createNewTag")}
                  </Badge>
                </div>
              )}
              {formData.categoryId &&
                availableTags.length === 0 &&
                !tagsLoading && (
                  <Badge
                    variant="outline"
                    className="text-primary hover:bg-primary/10 mt-2 cursor-pointer border-dashed px-3 py-1.5 transition-all hover:scale-105"
                    onClick={() => setCreateTagOpen(true)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    {t("createNewTag")}
                  </Badge>
                )}
              <div className="flex items-center gap-2 pt-2">
                <Sparkles className="text-primary h-4 w-4 animate-pulse" />
                <p className="text-muted-foreground text-[10px] italic">
                  {t("aiTaggingTip")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Images Card */}
          <Card className="overflow-hidden border-none bg-white/50 shadow-md backdrop-blur-sm">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Badge
                  variant="outline"
                  className="bg-primary shadow-primary/20 flex h-6 w-6 items-center justify-center rounded-full border-none p-0 text-white shadow-sm"
                >
                  7
                </Badge>
                <ImagePlus className="text-primary h-5 w-5" />
                {t("images")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-3 gap-2">
                {formData.images.map((url, index) => (
                  <div
                    key={index}
                    className="group relative aspect-square overflow-hidden rounded-xl border bg-white shadow-sm"
                  >
                    <img
                      src={url}
                      alt={`Image ${index + 1}`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="bg-destructive/90 absolute top-1 right-1 rounded-full p-1 text-white opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {formData.images.length < 5 && (
                  <label className="border-primary/20 bg-muted/30 hover:bg-primary/5 hover:border-primary/50 group flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                    {isUploading ? (
                      <Loader2 className="text-primary h-6 w-6 animate-spin" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 transition-transform group-hover:scale-110">
                        <ImagePlus className="text-primary/60 h-6 w-6" />
                        <span className="text-primary/60 text-[10px] font-bold uppercase">
                          {formData.images.length}/5
                        </span>
                      </div>
                    )}
                  </label>
                )}
              </div>
              <p className="text-muted-foreground animate-pulse text-center text-[10px]">
                {t("imagesHelp")}
              </p>
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card className="overflow-hidden border-none bg-white/50 shadow-md backdrop-blur-sm">
            <CardHeader className="bg-muted/30 border-b px-4 py-3">
              <CardTitle className="text-base">{t("status")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 py-4">
              {/* Publish Status */}
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="status"
                  className="cursor-pointer text-sm font-medium"
                >
                  {formData.status === "PUBLISHED" ? (
                    <span className="flex items-center gap-1.5 leading-none text-green-600">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-green-600" />
                      {t("statusPublished")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-1.5 leading-none">
                      <span className="bg-muted-foreground h-2 w-2 rounded-full" />
                      {t("statusDraft")}
                    </span>
                  )}
                </Label>
                <Switch
                  id="status"
                  checked={formData.status === "PUBLISHED"}
                  onCheckedChange={(checked) =>
                    handleChange("status", checked ? "PUBLISHED" : "DRAFT")
                  }
                  className="data-[state=checked]:bg-green-600"
                />
              </div>

              {/* Visibility */}
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="isActive"
                  className="cursor-pointer text-sm font-medium"
                >
                  {formData.isActive ? (
                    <span className="text-primary flex items-center gap-1.5 leading-none">
                      <span className="bg-primary h-2 w-2 animate-pulse rounded-full" />
                      {t("statusActive")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-1.5 leading-none">
                      <span className="bg-muted-foreground h-2 w-2 rounded-full" />
                      {t("statusInactive")}
                    </span>
                  )}
                </Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    handleChange("isActive", checked)
                  }
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </CardContent>
          </Card>

          {/* Discounts Card (edit mode only) */}
          {mode === "edit" && productId && (
            <DiscountSection productId={productId} />
          )}
          {mode === "create" && (
            <Card className="overflow-hidden border-none bg-white/50 opacity-60 shadow-md backdrop-blur-sm">
              <CardHeader className="bg-muted/30 border-b px-4 py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  {t("discounts")}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-4">
                <p className="text-muted-foreground text-sm">
                  {t("saveProductFirst")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </form>

      {formData.categoryId && (
        <CreateTagDialog
          open={createTagOpen}
          onOpenChange={setCreateTagOpen}
          categoryId={formData.categoryId}
          subcategoryId={formData.subcategoryId || null}
          onCreated={(tag) => {
            setAvailableTags((prev) =>
              prev.some((p) => p.id === tag.id) ? prev : [...prev, tag]
            );
            setFormData((prev) =>
              prev.tagIds.includes(tag.id)
                ? prev
                : { ...prev, tagIds: [...prev.tagIds, tag.id] }
            );
            toast.success(t("tagCreated"));
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Discount Section (for edit mode)
// ============================================================================

interface DiscountSectionProps {
  productId: string;
}

function DiscountSection({ productId }: DiscountSectionProps) {
  const t = useTranslations("seller.productForm");

  interface DiscountRecord {
    id: string;
    name: string;
    name_en?: string | null;
    name_ru?: string | null;
    name_am?: string | null;
    discountType: string;
    discountValue: number;
    startDate?: string | null;
    endDate?: string | null;
    isActive: boolean;
  }

  const [discounts, setDiscounts] = useState<DiscountRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [langTab, setLangTab] = useState<"en" | "ru" | "am">("en");
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [newDiscount, setNewDiscount] = useState({
    name_en: "",
    name_ru: "",
    name_am: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: "",
    startDate: null as Date | null,
    endDate: null as Date | null,
    autoTranslate: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        const res = await apiClient.get<DiscountRecord[]>(
          `/sellers/products/${productId}/discounts`
        );
        if (res.success && res.data) {
          setDiscounts(res.data);
        }
      } catch {
        // silent fail
      } finally {
        setIsLoading(false);
      }
    };
    void fetchDiscounts();
  }, [productId]);

  const handleCreate = async () => {
    const value = parseFloat(newDiscount.discountValue);
    if (isNaN(value) || value <= 0) return;

    setIsSaving(true);
    try {
      const name =
        newDiscount.name_en || newDiscount.name_ru || newDiscount.name_am || "";
      const res = await apiClient.post<DiscountRecord>(
        `/sellers/products/${productId}/discounts`,
        {
          name,
          name_en: newDiscount.name_en || undefined,
          name_ru: newDiscount.name_ru || undefined,
          name_am: newDiscount.name_am || undefined,
          discountType: newDiscount.discountType,
          discountValue: value,
          startDate: newDiscount.startDate?.toISOString() ?? undefined,
          endDate: newDiscount.endDate?.toISOString() ?? undefined,
          autoTranslate: newDiscount.autoTranslate,
          isActive: true,
        }
      );
      if (res.success && res.data) {
        const created = res.data;
        setDiscounts((prev) => [...prev, created]);
        setNewDiscount({
          name_en: "",
          name_ru: "",
          name_am: "",
          discountType: "percentage",
          discountValue: "",
          startDate: null,
          endDate: null,
          autoTranslate: false,
        });
        setShowForm(false);
        toast.success(t("discountAdded"));
      }
    } catch {
      toast.error(t("discountError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (discountId: string) => {
    try {
      await apiClient.delete(
        `/sellers/products/${productId}/discounts/${discountId}`
      );
      setDiscounts((prev) => prev.filter((d) => d.id !== discountId));
      toast.success(t("discountRemoved"));
    } catch {
      toast.error(t("discountError"));
    }
  };

  return (
    <Card className="overflow-hidden border-none bg-white/50 shadow-md backdrop-blur-sm">
      <CardHeader className="bg-muted/30 border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t("discounts")}</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? t("cancel") : t("addDiscount")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-2">
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          </div>
        ) : discounts.length === 0 && !showForm ? (
          <p className="text-muted-foreground text-sm">{t("noDiscounts")}</p>
        ) : (
          <div className="space-y-2">
            {discounts.map((d) => {
              const displayName = d.name_en || d.name_ru || d.name_am || d.name;
              const dateRange =
                d.startDate || d.endDate
                  ? ` (${d.startDate ? format(new Date(d.startDate), "MMM d") : "..."} - ${d.endDate ? format(new Date(d.endDate), "MMM d") : "..."})`
                  : "";
              return (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <div>
                    <span className="text-sm font-medium">
                      {displayName || t("noDiscounts")}
                    </span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {d.discountType === "percentage"
                        ? `-${d.discountValue}%`
                        : `-${d.discountValue} ֏`}
                      {dateRange}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive h-7 w-7"
                    onClick={() => void handleDelete(d.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {showForm && (
          <div className="space-y-3 rounded-md border p-3">
            {/* Language tabs for discount name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t("discountName")}</Label>
              <Tabs
                value={langTab}
                onValueChange={(v) => setLangTab(v as "en" | "ru" | "am")}
              >
                <TabsList className="grid h-7 w-full grid-cols-3">
                  <TabsTrigger value="en" className="py-0.5 text-xs">
                    EN
                  </TabsTrigger>
                  <TabsTrigger value="ru" className="py-0.5 text-xs">
                    RU
                  </TabsTrigger>
                  <TabsTrigger value="am" className="py-0.5 text-xs">
                    AM
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="en" className="mt-1.5">
                  <Input
                    value={newDiscount.name_en}
                    onChange={(e) =>
                      setNewDiscount((prev) => ({
                        ...prev,
                        name_en: e.target.value,
                      }))
                    }
                    placeholder={t("discountNamePlaceholder")}
                    className="h-8 text-sm"
                  />
                </TabsContent>
                <TabsContent value="ru" className="mt-1.5">
                  <Input
                    value={newDiscount.name_ru}
                    onChange={(e) =>
                      setNewDiscount((prev) => ({
                        ...prev,
                        name_ru: e.target.value,
                      }))
                    }
                    placeholder={t("discountNamePlaceholder")}
                    className="h-8 text-sm"
                  />
                </TabsContent>
                <TabsContent value="am" className="mt-1.5">
                  <Input
                    value={newDiscount.name_am}
                    onChange={(e) =>
                      setNewDiscount((prev) => ({
                        ...prev,
                        name_am: e.target.value,
                      }))
                    }
                    placeholder={t("discountNamePlaceholder")}
                    className="h-8 text-sm"
                  />
                </TabsContent>
              </Tabs>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="discount-auto-translate"
                  checked={newDiscount.autoTranslate}
                  onCheckedChange={(v) =>
                    setNewDiscount((prev) => ({ ...prev, autoTranslate: !!v }))
                  }
                />
                <label
                  htmlFor="discount-auto-translate"
                  className="text-muted-foreground flex cursor-pointer items-center gap-1 text-xs"
                >
                  <Sparkles className="h-3 w-3" />
                  {t("autoTranslateDiscount")}
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {t("discountTypeLbl")}
                </Label>
                <Select
                  value={newDiscount.discountType}
                  onValueChange={(v) =>
                    setNewDiscount((prev) => ({
                      ...prev,
                      discountType: v as "percentage" | "fixed",
                    }))
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">
                      {t("percentage")}
                    </SelectItem>
                    <SelectItem value="fixed">{t("fixedAmount")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {t("discountValueLbl")}
                </Label>
                <Input
                  type="number"
                  min="0"
                  max={
                    newDiscount.discountType === "percentage"
                      ? "100"
                      : undefined
                  }
                  step="0.01"
                  value={newDiscount.discountValue}
                  onChange={(e) =>
                    setNewDiscount((prev) => ({
                      ...prev,
                      discountValue: e.target.value,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>
            {/* Date pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {t("discountStartDate")}
                </Label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-full justify-start text-xs font-normal"
                    >
                      <CalendarIcon className="mr-1.5 h-3 w-3" />
                      {newDiscount.startDate ? (
                        format(newDiscount.startDate, "MMM d, yyyy")
                      ) : (
                        <span className="text-muted-foreground">Optional</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newDiscount.startDate ?? undefined}
                      onSelect={(date) => {
                        setNewDiscount((prev) => ({
                          ...prev,
                          startDate: date ?? null,
                        }));
                        setStartDateOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {t("discountEndDate")}
                </Label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-full justify-start text-xs font-normal"
                    >
                      <CalendarIcon className="mr-1.5 h-3 w-3" />
                      {newDiscount.endDate ? (
                        format(newDiscount.endDate, "MMM d, yyyy")
                      ) : (
                        <span className="text-muted-foreground">Optional</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newDiscount.endDate ?? undefined}
                      onSelect={(date) => {
                        setNewDiscount((prev) => ({
                          ...prev,
                          endDate: date ?? null,
                        }));
                        setEndDateOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={isSaving || !newDiscount.discountValue}
              onClick={() => void handleCreate()}
            >
              {isSaving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              {t("saveDiscount")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ProductForm;
