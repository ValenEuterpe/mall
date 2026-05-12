import { formatAmdPrice } from "@/lib/utils/price";

export interface ProductCardShop {
  id: string;
  fullCode: string;
  shopName?: string | null;
  businessName?: string | null;
  svgId?: string | null;
  venue?: string | null;
  building?: string | null;
  floor?: string | null;
}

export interface ProductCardCategory {
  id?: string;
  name_en: string;
  name_ru: string;
}

export interface ProductCardData {
  id: string;
  name: string;
  description?: string | null;
  basePrice: number;
  effectivePrice?: number;
  hasDiscount?: boolean;
  discount?: {
    type: string;
    value: number;
  } | null;
  stockQuantity: number;
  images: string[];
  brand?: string | null;
  shop?: ProductCardShop;
  category?: ProductCardCategory | null;
}

export interface ProductDiscountData {
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

export interface SellerProductCardData {
  id: string;
  name: string;
  description?: string | null;
  basePrice: number;
  stockQuantity: number;
  images: string[];
  isActive: boolean;
  status: "PUBLISHED" | "DRAFT" | "OUT_OF_STOCK" | string;
  sku?: string | null;
  discounts?: ProductDiscountData[];
  category?: {
    id: string;
    name: { en: string | null; ru: string | null };
  } | null;
  subcategory?: {
    id: string;
    name: { en: string | null; ru: string | null };
  } | null;
}

export type StockStatus = "out" | "low" | "in";

export interface StockStatusInfo {
  status: StockStatus;
  quantity: number;
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
}

export function getStockStatus(quantity: number): StockStatusInfo {
  if (quantity === 0) {
    return { status: "out", quantity, variant: "destructive" };
  }

  if (quantity <= 5) {
    return {
      status: "low",
      quantity,
      variant: "secondary",
      className:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
    };
  }

  return {
    status: "in",
    quantity,
    variant: "outline",
    className: "text-green-600",
  };
}

export function formatPrice(
  price: number,
  locale: string
): string {
  return formatAmdPrice(price, locale);
}
