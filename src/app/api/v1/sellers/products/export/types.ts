export interface ExportOptions {
  format: "xlsx" | "csv";
  includeImages: boolean;
  includeInactive: boolean;
  fields: string[];
  status?: string;
}

export interface ExportedProduct {
  Name: string;
  Description: string;
  Price: number;
  "Sale Price": number | string;
  Stock: number;
  SKU: string;
  Barcode: string;
  Brand: string;
  Category: string;
  Subcategory: string;
  Status: string;
  Active: string;
  Featured: string;
  "Created At": string;
  "Updated At": string;
  Images?: string;
}
