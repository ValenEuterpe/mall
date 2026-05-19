import { z } from "zod";

/**
 * Schema for creating a new tag (mall-owner-authored — all three names required).
 */
export const tagCreateSchema = z.object({
  key: z.string().min(1, "Key is required").toLowerCase().optional(),
  categoryId: z.string().min(1, "Category is required"),
  subcategoryId: z.string().min(1).optional().nullable(),
  name_en: z.string().min(1, "English name is required"),
  name_ru: z.string().min(1, "Russian name is required"),
  name_am: z.string().optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
  force: z.boolean().optional(),
});

/**
 * Schema for seller-authored tag creation. Seller types in their strongest language;
 * server auto-fills the rest via translateBatch. At least ONE of name_en / name_ru / name_am is required.
 */
export const tagSellerCreateSchema = z
  .object({
    key: z.string().min(1).toLowerCase().optional(),
    categoryId: z.string().min(1, "Category is required"),
    subcategoryId: z.string().min(1).optional().nullable(),
    name_en: z.string().optional().nullable(),
    name_ru: z.string().optional().nullable(),
    name_am: z.string().optional().nullable(),
    force: z.boolean().optional(),
  })
  .refine(
    (v) => Boolean((v.name_en && v.name_en.trim()) || (v.name_ru && v.name_ru.trim()) || (v.name_am && v.name_am.trim())),
    { message: "At least one of name_en, name_ru, or name_am is required", path: ["name_en"] }
  );

/**
 * Schema for updating an existing tag
 */
export const tagUpdateSchema = z.object({
  name_en: z.string().min(1, "English name is required").optional(),
  name_ru: z.string().min(1, "Russian name is required").optional(),
  name_am: z.string().optional().nullable(),
  subcategoryId: z.string().min(1).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const tagDedupCheckSchema = z.object({
  categoryId: z.string().min(1),
  subcategoryId: z.string().min(1).optional().nullable(),
  name_en: z.string().optional().nullable(),
  name_ru: z.string().optional().nullable(),
  name_am: z.string().optional().nullable(),
  q: z.string().optional().nullable(),
});

export type TagCreateInput = z.infer<typeof tagCreateSchema>;
export type TagSellerCreateInput = z.infer<typeof tagSellerCreateSchema>;
export type TagUpdateInput = z.infer<typeof tagUpdateSchema>;
export type TagDedupCheckInput = z.infer<typeof tagDedupCheckSchema>;
