export type { SupportedLocale } from "@/lib/i18n/locale";

export interface FormattedCategory {
  id: string;
  key: string;
  name: string;
  icon: string | null;
  productCount: number;
  subcategories: FormattedSubcategory[];
}

export interface FormattedSubcategory {
  id: string;
  key: string;
  name: string;
  productCount: number;
}
