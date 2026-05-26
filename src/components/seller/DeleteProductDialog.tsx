"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/utils/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface DeleteProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: { id: string; name: string } | null;
  onDeleted?: (deletedProductId: string) => void;
}

export function DeleteProductDialog({
  open,
  onOpenChange,
  product,
  onDeleted,
}: DeleteProductDialogProps) {
  const t = useTranslations("seller.products");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (!product) return;

    setIsDeleting(true);
    try {
      const res = await apiClient.delete(`/sellers/products/${product.id}`);
      if (res.success) {
        toast.success(t("deleteSuccess"));
        onDeleted?.(product.id);
        onOpenChange(false);
      } else {
        toast.error(t("deleteFailed"));
      }
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : t("deleteFailed");
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("deleteDialog.description", { name: product?.name || "" })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            {t("deleteDialog.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("deleteDialog.deleting")}
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                {t("deleteDialog.confirm")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DeleteProductDialog;
