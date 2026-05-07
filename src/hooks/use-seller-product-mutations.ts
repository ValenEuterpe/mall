"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/utils/toast";

export interface UseSellerProductMutationsOptions {
  productId: string;
}

export interface DiscountInput {
  name: string;
  name_en?: string;
  name_ru?: string;
  name_am?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
  autoTranslate?: boolean;
}

export interface DiscountData {
  id: string;
  name: string;
  name_en?: string | null;
  name_ru?: string | null;
  name_am?: string | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

export interface SellerProductMutations {
  updateImages: (images: string[]) => Promise<void>;
  updatePrice: (basePrice: number) => Promise<void>;
  updateQuantity: (stockQuantity: number) => Promise<void>;
  updateActive: (isActive: boolean) => Promise<void>;
  updateStatus: (status: string) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  updateDescription: (description: string) => Promise<void>;
  createDiscount: (data: DiscountInput) => Promise<DiscountData>;
  updateDiscount: (
    discountId: string,
    data: Partial<DiscountInput>
  ) => Promise<DiscountData>;
  deleteDiscount: (discountId: string) => Promise<void>;
}

export function useSellerProductMutations(
  options: UseSellerProductMutationsOptions
): SellerProductMutations {
  const { productId } = options;
  const t = useTranslations("sellerProduct");

  const updateImages = useCallback(
    async (images: string[]): Promise<void> => {
      await apiClient.put(`/sellers/products/${productId}`, { images });
      toast.success(t("imageAdded"));
    },
    [productId, t]
  );

  const updatePrice = useCallback(
    async (basePrice: number): Promise<void> => {
      await apiClient.put(`/sellers/products/${productId}`, { basePrice });
      toast.success(t("priceUpdated"));
    },
    [productId, t]
  );

  const updateQuantity = useCallback(
    async (stockQuantity: number): Promise<void> => {
      await apiClient.put(`/sellers/products/${productId}`, { stockQuantity });
      toast.success(t("quantityUpdated"));
    },
    [productId, t]
  );

  const updateActive = useCallback(
    async (isActive: boolean): Promise<void> => {
      await apiClient.put(`/sellers/products/${productId}`, { isActive });
      toast.success(isActive ? t("activated") : t("deactivated"));
    },
    [productId, t]
  );

  const updateStatus = useCallback(
    async (status: string): Promise<void> => {
      await apiClient.put(`/sellers/products/${productId}`, { status });
      toast.success(status === "PUBLISHED" ? t("published") : t("unpublished"));
    },
    [productId, t]
  );

  const updateName = useCallback(
    async (name: string): Promise<void> => {
      await apiClient.put(`/sellers/products/${productId}`, { name });
      toast.success(t("nameUpdated"));
    },
    [productId, t]
  );

  const updateDescription = useCallback(
    async (description: string): Promise<void> => {
      await apiClient.put(`/sellers/products/${productId}`, { description });
      toast.success(t("descriptionUpdated"));
    },
    [productId, t]
  );

  const createDiscount = useCallback(
    async (data: DiscountInput): Promise<DiscountData> => {
      const res = await apiClient.post<DiscountData>(
        `/sellers/products/${productId}/discounts`,
        data
      );
      if (!res.success || !res.data)
        throw new Error("Failed to create discount");
      toast.success(t("saleAdded"));
      return res.data;
    },
    [productId, t]
  );

  const updateDiscount = useCallback(
    async (
      discountId: string,
      data: Partial<DiscountInput>
    ): Promise<DiscountData> => {
      const res = await apiClient.put<DiscountData>(
        `/sellers/products/${productId}/discounts/${discountId}`,
        data
      );
      if (!res.success || !res.data)
        throw new Error("Failed to update discount");
      toast.success(t("saleUpdated"));
      return res.data;
    },
    [productId, t]
  );

  const deleteDiscount = useCallback(
    async (discountId: string): Promise<void> => {
      await apiClient.delete(
        `/sellers/products/${productId}/discounts/${discountId}`
      );
      toast.success(t("saleRemoved"));
    },
    [productId, t]
  );

  return {
    updateImages,
    updatePrice,
    updateQuantity,
    updateActive,
    updateStatus,
    updateName,
    updateDescription,
    createDiscount,
    updateDiscount,
    deleteDiscount,
  };
}
