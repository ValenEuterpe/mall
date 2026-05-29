"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { unwrapApiResponse } from "@/components/mall-owner/api";
import { useToast } from "@/hooks/useToast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  CategoryDialog,
  type CategoryFormData,
  type CategoryLevel,
} from "@/components/mall-owner/dialogs/CategoryDialog";

// ============================================================================
// TYPES
// ============================================================================

type SubSubcategoryData = {
  id: string;
  key: string;
  name_en: string;
  name_ru: string;
  name_am: string | null;
  _count: { products: number };
};

type SubcategoryData = {
  id: string;
  key: string;
  name_en: string;
  name_ru: string;
  name_am: string | null;
  subSubcategories: SubSubcategoryData[];
  _count: { products: number };
};

type CategoryData = {
  id: string;
  key: string;
  name_en: string;
  name_ru: string;
  name_am: string | null;
  icon: string | null;
  subcategories: SubcategoryData[];
  _count: { products: number };
};

type DialogState = {
  open: boolean;
  mode: "create" | "edit";
  level: CategoryLevel;
  parentId: string | null;
  initialData: CategoryFormData | null;
  parentName: string;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SubSubcategoryRow({
  item,
  onEdit,
  onDelete,
  t,
}: {
  item: SubSubcategoryData;
  onEdit: (item: SubSubcategoryData) => void;
  onDelete: (item: SubSubcategoryData) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="bg-card ml-12 flex items-center justify-between rounded-md border px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{item.name_en}</span>
        <Badge variant="outline" className="font-mono text-xs">
          {item.key}
        </Badge>
        <span className="text-muted-foreground text-xs">
          {t("productCount", { count: item._count.products })}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit(item)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive h-7 w-7"
          onClick={() => onDelete(item)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function SubcategorySection({
  item,
  onAddSubSub,
  onEdit,
  onDelete,
  onEditSubSub,
  onDeleteSubSub,
  t,
}: {
  item: SubcategoryData;
  onAddSubSub: (parentId: string, parentName: string) => void;
  onEdit: (item: SubcategoryData) => void;
  onDelete: (item: SubcategoryData) => void;
  onEditSubSub: (item: SubSubcategoryData, parentId: string) => void;
  onDeleteSubSub: (item: SubSubcategoryData) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="ml-6 flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="hover:bg-muted flex flex-1 items-center gap-2 rounded-md px-2 py-1.5"
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">{item.name_en}</span>
            <Badge variant="outline" className="font-mono text-xs">
              {item.key}
            </Badge>
            <span className="text-muted-foreground text-xs">
              {t("productCount", { count: item._count.products })}
            </span>
            {item.subSubcategories.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {t("subcategoryCount", {
                  count: item.subSubcategories.length,
                })}
              </Badge>
            )}
          </button>
        </CollapsibleTrigger>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onAddSubSub(item.id, item.name_en)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(item)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive h-7 w-7"
            onClick={() => onDelete(item)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <CollapsibleContent className="mt-1 space-y-1">
        {item.subSubcategories.map((subSub) => (
          <SubSubcategoryRow
            key={subSub.id}
            item={subSub}
            onEdit={(s) => onEditSubSub(s, item.id)}
            onDelete={onDeleteSubSub}
            t={t}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function CategorySection({
  category,
  onAddSubcategory,
  onEditCategory,
  onDeleteCategory,
  onEditSubcategory,
  onDeleteSubcategory,
  onAddSubSub,
  onEditSubSub,
  onDeleteSubSub,
  t,
}: {
  category: CategoryData;
  onAddSubcategory: (parentId: string, parentName: string) => void;
  onEditCategory: (category: CategoryData) => void;
  onDeleteCategory: (category: CategoryData) => void;
  onEditSubcategory: (item: SubcategoryData) => void;
  onDeleteSubcategory: (item: SubcategoryData) => void;
  onAddSubSub: (parentId: string, parentName: string) => void;
  onEditSubSub: (item: SubSubcategoryData, parentId: string) => void;
  onDeleteSubSub: (item: SubSubcategoryData) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="bg-muted/50 hover:bg-muted flex flex-1 items-center gap-2 rounded-md px-3 py-2"
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {category.icon ? (
              <Image
                src={category.icon}
                alt=""
                width={20}
                height={20}
                className="h-5 w-5 shrink-0 rounded-sm object-contain"
              />
            ) : (
              <FolderTree className="h-4 w-4 text-blue-500" />
            )}
            <span className="font-medium">{category.name_en}</span>
            <Badge variant="outline" className="font-mono text-xs">
              {category.key}
            </Badge>
            <span className="text-muted-foreground text-xs">
              {t("productCount", { count: category._count.products })}
            </span>
            {category.subcategories.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {t("subcategoryCount", {
                  count: category.subcategories.length,
                })}
              </Badge>
            )}
          </button>
        </CollapsibleTrigger>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => onAddSubcategory(category.id, category.name_en)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t("addSubcategory")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEditCategory(category)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive h-7 w-7"
            onClick={() => onDeleteCategory(category)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <CollapsibleContent className="mt-1 space-y-1">
        {category.subcategories.length === 0 ? (
          <div className="bg-muted/30 ml-6 flex items-center justify-between rounded-md border border-dashed p-3">
            <span className="text-muted-foreground text-sm">
              {t("subcategoryCount", { count: 0 })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddSubcategory(category.id, category.name_en)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("addSubcategory")}
            </Button>
          </div>
        ) : (
          category.subcategories.map((sub) => (
            <SubcategorySection
              key={sub.id}
              item={sub}
              onAddSubSub={onAddSubSub}
              onEdit={onEditSubcategory}
              onDelete={onDeleteSubcategory}
              onEditSubSub={onEditSubSub}
              onDeleteSubSub={onDeleteSubSub}
              t={t}
            />
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MallOwnerCategoriesPanel(): React.ReactElement {
  const t = useTranslations("mallOwner.categories");
  const toast = useToast();

  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [dialogState, setDialogState] = useState<DialogState>({
    open: false,
    mode: "create",
    level: "category",
    parentId: null,
    initialData: null,
    parentName: "",
  });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string;
    level: CategoryLevel;
    name: string;
  }>({ open: false, id: "", level: "category", name: "" });

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any>("/mall/categories");
      const data = unwrapApiResponse<CategoryData[]>(res);
      setCategories(data || []);
    } catch (err) {
      toast.apiError(err, t("createSuccess"));
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreateDialog = (
    level: CategoryLevel,
    parentId: string | null,
    parentName: string
  ) => {
    setDialogState({
      open: true,
      mode: "create",
      level,
      parentId,
      initialData: null,
      parentName,
    });
  };

  const openEditDialog = (
    level: CategoryLevel,
    item: {
      id: string;
      key: string;
      name_en: string;
      name_ru: string;
      name_am: string | null;
      icon?: string | null;
    }
  ) => {
    setDialogState({
      open: true,
      mode: "edit",
      level,
      parentId: null,
      initialData: {
        id: item.id,
        key: item.key,
        name_en: item.name_en,
        name_ru: item.name_ru,
        name_am: item.name_am || "",
        icon: item.icon || undefined,
      },
      parentName: "",
    });
  };

  const onDialogSubmit = useCallback(
    async (data: CategoryFormData) => {
      setSubmitting(true);
      try {
        if (dialogState.mode === "create") {
          if (dialogState.level === "category") {
            await apiClient.post("/mall/categories", data);
          } else if (dialogState.level === "subcategory") {
            await apiClient.post(
              `/mall/categories/${dialogState.parentId}/subcategories`,
              data
            );
          } else {
            await apiClient.post(
              `/mall/categories/subcategories/${dialogState.parentId}/sub-subcategories`,
              data
            );
          }
          toast.success(t("createSuccess"));
        } else {
          if (dialogState.level === "category") {
            await apiClient.put(
              `/mall/categories/${dialogState.initialData?.id}`,
              data
            );
          } else if (dialogState.level === "subcategory") {
            await apiClient.put(
              `/mall/categories/subcategories/${dialogState.initialData?.id}`,
              data
            );
          } else {
            await apiClient.put(
              `/mall/categories/sub-subcategories/${dialogState.initialData?.id}`,
              data
            );
          }
          toast.success(t("updateSuccess"));
        }
        setDialogState((prev) => ({ ...prev, open: false }));
        await fetchCategories();
      } catch (err) {
        toast.apiError(err, t("duplicateKey"));
      } finally {
        setSubmitting(false);
      }
    },
    [dialogState, fetchCategories, t, toast]
  );

  const onConfirmDelete = useCallback(async () => {
    setSubmitting(true);
    try {
      if (deleteDialog.level === "category") {
        await apiClient.delete(`/mall/categories/${deleteDialog.id}`);
      } else if (deleteDialog.level === "subcategory") {
        await apiClient.delete(
          `/mall/categories/subcategories/${deleteDialog.id}`
        );
      } else {
        await apiClient.delete(
          `/mall/categories/sub-subcategories/${deleteDialog.id}`
        );
      }
      toast.success(t("deleteSuccess"));
      setDeleteDialog({ open: false, id: "", level: "category", name: "" });
      await fetchCategories();
    } catch (err) {
      toast.apiError(err, t("deleteBlockedByProducts", { count: 0 }));
      setDeleteDialog({ open: false, id: "", level: "category", name: "" });
    } finally {
      setSubmitting(false);
    }
  }, [deleteDialog, fetchCategories, t, toast]);

  const handleEditSubSub = (item: SubSubcategoryData, _parentId: string) => {
    openEditDialog("subSubcategory", { ...item, icon: null });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            {t("title")}
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("description")}
          </p>
        </div>
        <Button onClick={() => openCreateDialog("category", null, "")}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addCategory")}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : categories.length === 0 ? (
          <div className="py-8 text-center">
            <FolderTree className="text-muted-foreground mx-auto h-10 w-10" />
            <h3 className="mt-3 text-sm font-semibold">{t("emptyTitle")}</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("emptyDescription")}
            </p>
            <Button
              className="mt-4"
              onClick={() => openCreateDialog("category", null, "")}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("addCategory")}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((cat) => (
              <CategorySection
                key={cat.id}
                category={cat}
                onAddSubcategory={(id, name) =>
                  openCreateDialog("subcategory", id, name)
                }
                onEditCategory={(c) => openEditDialog("category", c)}
                onDeleteCategory={(c) =>
                  setDeleteDialog({
                    open: true,
                    id: c.id,
                    level: "category",
                    name: c.name_en,
                  })
                }
                onEditSubcategory={(s) => openEditDialog("subcategory", s)}
                onDeleteSubcategory={(s) =>
                  setDeleteDialog({
                    open: true,
                    id: s.id,
                    level: "subcategory",
                    name: s.name_en,
                  })
                }
                onAddSubSub={(id, name) =>
                  openCreateDialog("subSubcategory", id, name)
                }
                onEditSubSub={handleEditSubSub}
                onDeleteSubSub={(s) =>
                  setDeleteDialog({
                    open: true,
                    id: s.id,
                    level: "subSubcategory",
                    name: s.name_en,
                  })
                }
                t={t}
              />
            ))}
          </div>
        )}
      </CardContent>

      <CategoryDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}
        mode={dialogState.mode}
        level={dialogState.level}
        initialData={dialogState.initialData}
        parentName={dialogState.parentName}
        onSubmit={onDialogSubmit}
        submitting={submitting}
      />

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirmDescription", { name: deleteDialog.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setDeleteDialog({
                  open: false,
                  id: "",
                  level: "category",
                  name: "",
                })
              }
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={submitting}
              onClick={onConfirmDelete}
            >
              {t("deleteConfirmTitle")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
