"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Tag as TagIcon,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";

import { mallApiFetch } from "@/lib/api-client/mall-fetch";
import { useToast } from "@/hooks/useToast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

import { AddTagDialog, type TagFormData } from "./dialogs/AddTagDialog";
import { EditTagDialog, type TagUpdateFormData } from "./dialogs/EditTagDialog";

// ============================================================================
// TYPES
// ============================================================================

type TagData = {
  id: string;
  key: string;
  categoryId: string;
  subcategoryId: string | null;
  name_en: string;
  name_ru: string;
  name_am: string | null;
  sortOrder: number;
  category: {
    name_en: string;
    key: string;
  };
  subcategory: {
    id: string;
    name_en: string;
  } | null;
  _count: {
    products: number;
  };
  createdBySeller: {
    id: string;
    businessName: string;
  } | null;
};

type CategoryOption = {
  id: string;
  key: string;
  name_en: string;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MallOwnerTagsPanel(): React.ReactElement {
  const t = useTranslations("mallOwner.tags");
  const commonT = useTranslations("common");
  const toast = useToast();

  const [tags, setTags] = useState<TagData[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<TagData | null>(null);

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string;
    name: string;
    count: number;
  }>({ open: false, id: "", name: "", count: 0 });

  const fetchCategories = useCallback(async () => {
    try {
      const res = await mallApiFetch("/api/v1/mall/categories");
      const body = await res.json();
      if (body.success) {
        setCategories(body.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch categories", err);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        selectedCategoryId !== "all"
          ? `/api/v1/mall-owner/tags?categoryId=${selectedCategoryId}`
          : "/api/v1/mall-owner/tags";

      const res = await mallApiFetch(url);
      const body = await res.json();
      if (body.success) {
        setTags(body.data || []);
      } else {
        toast.error(body.error?.message || t("fetchError"));
      }
    } catch (_err) {
      toast.error(t("fetchError"));
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryId, t, toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleAddTag = async (data: TagFormData) => {
    setSubmitting(true);
    try {
      const res = await mallApiFetch("/api/v1/mall-owner/tags", {
        method: "POST",
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (body.success) {
        toast.success(t("createSuccess"));
        setAddDialogOpen(false);
        fetchTags();
      } else {
        toast.error(body.error?.message || t("createError"));
      }
    } catch (_err) {
      toast.error(t("createError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTag = async (data: TagUpdateFormData) => {
    if (!selectedTag) return;
    setSubmitting(true);
    try {
      const res = await mallApiFetch(
        `/api/v1/mall-owner/tags/${selectedTag.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        }
      );
      const body = await res.json();
      if (body.success) {
        toast.success(t("updateSuccess"));
        setEditDialogOpen(false);
        fetchTags();
      } else {
        toast.error(body.error?.message || t("updateError"));
      }
    } catch (_err) {
      toast.error(t("updateError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTag = async () => {
    setSubmitting(true);
    try {
      const res = await mallApiFetch(
        `/api/v1/mall-owner/tags/${deleteDialog.id}`,
        {
          method: "DELETE",
        }
      );
      const body = await res.json();
      if (body.success) {
        toast.success(t("deleteSuccess"));
        setDeleteDialog({ open: false, id: "", name: "", count: 0 });
        fetchTags();
      } else {
        toast.error(body.error?.message || t("deleteError"));
      }
    } catch (_err) {
      toast.error(t("deleteError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSeedTags = async () => {
    if (selectedCategoryId === "all") {
      toast.error(t("selectCategoryToSeed"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await mallApiFetch(
        `/api/v1/mall-owner/tags/seed?categoryId=${selectedCategoryId}`,
        {
          method: "POST",
        }
      );
      const body = await res.json();
      if (body.success) {
        toast.success(
          t("seedSuccess", {
            inserted: body.data.inserted,
            skipped: body.data.skipped,
          })
        );
        fetchTags();
      } else {
        toast.error(body.error?.message || t("seedError"));
      }
    } catch (_err) {
      toast.error(t("seedError"));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTags = React.useMemo(() => {
    return tags.filter(
      (tag) =>
        tag.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tag.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tag.name_ru &&
          tag.name_ru.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [tags, searchQuery]);

  const groupedTags = React.useMemo(() => {
    const groups: Record<
      string,
      { id: string; name: string; tags: TagData[] }
    > = {};

    filteredTags.forEach((tag) => {
      const subId = tag.subcategoryId || "none";
      if (!groups[subId]) {
        groups[subId] = {
          id: subId,
          name: tag.subcategory?.name_en || t("subcategoryNone"),
          tags: [],
        };
      }
      groups[subId].tags.push(tag);
    });

    // Sort groups so "none" is first, then by name
    return Object.values(groups).sort((a, b) => {
      if (a.id === "none") return -1;
      if (b.id === "none") return 1;
      return a.name.localeCompare(b.name);
    });
  }, [filteredTags, t]);

  useEffect(() => {
    // Expand all groups by default when searching or changing category
    const initialExpanded: Record<string, boolean> = {};
    groupedTags.forEach((g) => {
      initialExpanded[g.id] = true;
    });
    setExpandedGroups(initialExpanded);
  }, [groupedTags]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedCategoryName =
    categories.find((c) => c.id === selectedCategoryId)?.name_en || "";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TagIcon className="h-5 w-5" />
              {t("title")}
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("description")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSeedTags}
              disabled={submitting || selectedCategoryId === "all"}
              title={t("seedButtonTooltip")}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${submitting ? "animate-spin" : ""}`}
              />
              {t("seedButton")}
            </Button>
            <Button
              onClick={() => setAddDialogOpen(true)}
              disabled={selectedCategoryId === "all"}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("addTag")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="flex min-w-[200px] flex-1 items-center gap-2">
              <Search className="text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="text-muted-foreground h-4 w-4" />
              <Select
                value={selectedCategoryId}
                onValueChange={setSelectedCategoryId}
              >
                <SelectTrigger className="h-9 w-[200px]">
                  <SelectValue placeholder={t("filterByCategory")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allCategories")}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : groupedTags.length === 0 ? (
            <div className="py-12 text-center">
              <TagIcon className="text-muted-foreground mx-auto h-12 w-12 opacity-20" />
              <h3 className="mt-4 text-lg font-medium">{t("noTagsFound")}</h3>
              <p className="text-muted-foreground mt-2">
                {selectedCategoryId === "all"
                  ? t("selectCategoryToStart")
                  : t("noTagsInCategory")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedTags.map((group) => (
                <div
                  key={group.id}
                  className="overflow-hidden rounded-md border"
                >
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="bg-muted/30 hover:bg-muted/50 flex w-full items-center justify-between px-4 py-2 text-sm font-medium transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span>{group.name}</span>
                      <Badge variant="outline" className="h-4 py-0 text-[10px]">
                        {group.tags.length}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground">
                      {expandedGroups[group.id] ? "−" : "+"}
                    </div>
                  </button>

                  {expandedGroups[group.id] && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/10 text-muted-foreground border-b font-medium">
                          <tr>
                            <th className="px-4 py-2">{t("tagName")}</th>
                            <th className="px-4 py-2">{t("tagKey")}</th>
                            <th className="px-4 py-2">{commonT("actions")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {group.tags.map((tag) => (
                            <tr
                              key={tag.id}
                              className="hover:bg-muted/10 transition-colors"
                            >
                              <td className="px-4 py-2">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {tag.name_en}
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className="h-4 py-0 text-[10px]"
                                    >
                                      {t("usageCount", {
                                        count: tag._count.products,
                                      })}
                                    </Badge>
                                  </div>
                                  <div className="text-muted-foreground text-xs">
                                    {tag.name_ru}
                                  </div>
                                  {tag.createdBySeller && (
                                    <div className="text-muted-foreground mt-0.5 text-[10px] italic">
                                      {t("createdBySeller", {
                                        name: tag.createdBySeller.businessName,
                                      })}
                                    </div>
                                  )}
                                  {!tag.createdBySeller &&
                                    !tag.key.startsWith("seed-") && (
                                      <div className="text-muted-foreground mt-0.5 text-[10px] italic">
                                        {t("seededTag")}
                                      </div>
                                    )}
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <Badge
                                  variant="outline"
                                  className="font-mono text-[10px]"
                                >
                                  {tag.key}
                                </Badge>
                              </td>
                              <td className="px-4 py-2 text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      setSelectedTag(tag);
                                      setEditDialogOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive h-7 w-7"
                                    onClick={() =>
                                      setDeleteDialog({
                                        open: true,
                                        id: tag.id,
                                        name: tag.name_en,
                                        count: tag._count.products,
                                      })
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddTagDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={handleAddTag}
        submitting={submitting}
        categoryId={selectedCategoryId}
        categoryName={selectedCategoryName}
      />

      <EditTagDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleUpdateTag}
        submitting={submitting}
        initialData={selectedTag}
      />

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {deleteDialog.count > 0
                ? t("deleteWithUsageDescription", {
                    name: deleteDialog.name,
                    count: deleteDialog.count,
                  })
                : t("deleteConfirmDescription", { name: deleteDialog.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setDeleteDialog({ open: false, id: "", name: "", count: 0 })
              }
            >
              {commonT("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={submitting}
              onClick={handleDeleteTag}
            >
              {submitting ? "..." : t("deleteConfirmButton")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
