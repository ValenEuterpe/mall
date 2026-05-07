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

export type SupportedLocale = "en" | "ru" | "am";
