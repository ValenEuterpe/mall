import { z } from "zod";
import { ProductStatus } from "@/prisma/generated/client";

// Price tier schema for wholesale pricing
const priceTierSchema = z.object({
  minQuantity: z.number().int().positive("Minimum quantity must be positive"),
  maxQuantity: z.number().int().positive().optional().nullable(),
  price: z.number().positive("Price must be positive"),
});

// The following multilingual schemas are kept for reference / potential use
// by the create/update flows but are not currently referenced. Prefixed with
// `_` so the lint rule treats them as intentionally retained.
const _multilingualTextSchema = z
  .object({
    en: z.string().max(255).optional(),
    ru: z.string().max(255).optional(),
    am: z.string().max(255).optional(),
  })
  .refine((data) => data.en || data.ru || data.am, {
    message: "At least one language is required",
  });

const _multilingualDescriptionSchema = z.object({
  en: z.string().max(2000).optional(),
  ru: z.string().max(2000).optional(),
  am: z.string().max(2000).optional(),
});

const _multilingualDetailDescriptionSchema = z.object({
  en: z.string().max(10000).optional(),
  ru: z.string().max(10000).optional(),
  am: z.string().max(10000).optional(),
});

const productBaseSchema = z.object({
  // Legacy single-language field (kept for backward compatibility)
  name: z.string().min(1, "Product name is required").max(255).optional(),
  description: z.string().max(500).optional(),
  detailDescription: z.string().optional(),

  // New multilingual fields
  name_en: z.string().max(255).optional(),
  name_ru: z.string().max(255).optional(),
  name_am: z.string().max(255).optional(),
  description_en: z.string().max(2000).optional(),
  description_ru: z.string().max(2000).optional(),
  description_am: z.string().max(2000).optional(),
  detailDescription_en: z.string().max(10000).optional(),
  detailDescription_ru: z.string().max(10000).optional(),
  detailDescription_am: z.string().max(10000).optional(),

  // Product details
  basePrice: z.number().positive("Price must be positive"),
  stockQuantity: z
    .number()
    .int()
    .nonnegative("Stock cannot be negative")
    .optional()
    .default(0),
  categoryId: z.string().cuid().optional(),
  subcategoryId: z.string().cuid().optional(),
  subSubcategoryId: z.string().cuid().optional(),
  brand: z.string().max(100).optional(),
  sku: z.string().max(100).optional(),
  barcode: z.string().max(100).optional(),
  unitType: z.string().default("piece"),
  images: z
    .array(z.string().min(1))
    .max(5, "Maximum 5 images allowed")
    .default([]),
  tags: z.array(z.string()).default([]), // Old free-form tags
  tagIds: z.array(z.string()).default([]), // New controlled tags
  status: z.nativeEnum(ProductStatus).default(ProductStatus.DRAFT),
  isFeatured: z.boolean().default(false),
  priceTiers: z.array(priceTierSchema).optional(),

  // Flag to request auto-translation via Gemini
  autoTranslate: z.boolean().default(false),
});

export const productCreateSchema = productBaseSchema.refine(
  (data) => data.name || data.name_en || data.name_ru || data.name_am,
  {
    message: "Product name is required in at least one language",
    path: ["name"],
  }
);

// NOTE: do NOT call .partial() on a schema that contains refinements.
// For updates we allow partial payloads so sellers can update price/stock/etc without re-sending names.
// Also avoid defaults in the update schema: we only want to update fields explicitly provided by the client.
export const productUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(500).optional(),
  detailDescription: z.string().optional(),

  name_en: z.string().max(255).optional(),
  name_ru: z.string().max(255).optional(),
  name_am: z.string().max(255).optional(),
  description_en: z.string().max(2000).optional(),
  description_ru: z.string().max(2000).optional(),
  description_am: z.string().max(2000).optional(),
  detailDescription_en: z.string().max(10000).optional(),
  detailDescription_ru: z.string().max(10000).optional(),
  detailDescription_am: z.string().max(10000).optional(),

  basePrice: z.number().positive().optional(),
  stockQuantity: z.number().int().nonnegative().optional(),
  categoryId: z.string().cuid().nullable().optional(),
  subcategoryId: z.string().cuid().nullable().optional(),
  subSubcategoryId: z.string().cuid().nullable().optional(),
  brand: z.string().max(100).nullable().optional(),
  keywords: z.array(z.string()).optional(),
  productType: z.string().max(100).nullable().optional(),
  sku: z.string().max(100).nullable().optional(),
  barcode: z.string().max(100).nullable().optional(),
  unitType: z.string().optional(),
  images: z.array(z.string().min(1)).max(5).optional(),
  tags: z.array(z.string()).optional(), // Old free-form tags
  tagIds: z.array(z.string()).optional(), // New controlled tags
  status: z.nativeEnum(ProductStatus).optional(),
  isFeatured: z.boolean().optional(),
  priceTiers: z.array(priceTierSchema).optional(),
  isActive: z.boolean().optional(),

  // Accepted for backward compatibility but ignored by update route (translation handled elsewhere)
  autoTranslate: z.boolean().optional(),
});

export const productImportSchema = z.object({
  products: z.array(
    z
      .object({
        // Support both legacy and multilingual names
        name: z.string().min(1).optional(),
        name_en: z.string().optional(),
        name_ru: z.string().optional(),
        name_am: z.string().optional(),
        description: z.string().optional(),
        description_en: z.string().optional(),
        description_ru: z.string().optional(),
        description_am: z.string().optional(),
        basePrice: z.number().positive(),
        stockQuantity: z.number().int().nonnegative().default(0),
        brand: z.string().optional(),
        sku: z.string().optional(),
        barcode: z.string().optional(),
        categoryId: z.string().optional(),
        subcategoryId: z.string().optional(),
        subSubcategoryId: z.string().optional(),
        status: z.nativeEnum(ProductStatus).default(ProductStatus.DRAFT),
      })
      .refine(
        (data) => data.name || data.name_en || data.name_ru || data.name_am,
        { message: "Product name is required in at least one language" }
      )
  ),
  updateExisting: z.boolean().default(false),
  skipErrors: z.boolean().default(false),
});

// Helper schema for batch translation input
export const productTranslationInputSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  detailDescription: z.string().max(10000).optional(),
});

// Discount schemas
export const discountCreateSchema = z
  .object({
    name: z.string().max(100).optional(),
    name_en: z.string().max(100).optional(),
    name_ru: z.string().max(100).optional(),
    name_am: z.string().max(100).optional(),
    discountType: z.enum(["percentage", "fixed"]),
    discountValue: z.number().positive("Discount value must be positive"),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),
    isActive: z.boolean().default(true),
    autoTranslate: z.boolean().default(false),
  })
  .refine(
    (data) => data.discountType !== "percentage" || data.discountValue <= 100,
    {
      message: "Percentage discount cannot exceed 100%",
      path: ["discountValue"],
    }
  );

export const discountUpdateSchema = z.object({
  name: z.string().max(100).optional(),
  name_en: z.string().max(100).optional(),
  name_ru: z.string().max(100).optional(),
  name_am: z.string().max(100).optional(),
  discountType: z.enum(["percentage", "fixed"]).optional(),
  discountValue: z.number().positive().optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductImportInput = z.infer<typeof productImportSchema>;
export type ProductTranslationInput = z.infer<
  typeof productTranslationInputSchema
>;
export type DiscountCreateInput = z.infer<typeof discountCreateSchema>;
export type DiscountUpdateInput = z.infer<typeof discountUpdateSchema>;
