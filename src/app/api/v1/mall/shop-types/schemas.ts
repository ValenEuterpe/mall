import { z } from "zod";

export const createShopTypeSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(50)
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      "Key must be UPPER_SNAKE_CASE (e.g., SHOP, EATERY)"
    ),
  name_en: z.string().min(1).max(200),
  name_ru: z.string().min(1).max(200),
  name_am: z.string().max(200).optional(),
  icon: z.string().max(255).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex color (e.g., #FF5733)")
    .optional(),
  supportsProducts: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateShopTypeSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[A-Z][A-Z0-9_]*$/)
    .optional(),
  name_en: z.string().min(1).max(200).optional(),
  name_ru: z.string().min(1).max(200).optional(),
  name_am: z.string().max(200).optional().nullable(),
  icon: z.string().max(255).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .nullable(),
  supportsProducts: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});
