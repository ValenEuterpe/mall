import { z } from "zod";

const keyPattern = /^[a-z0-9_]+$/;
const keyMessage = "Key must be lowercase alphanumeric with underscores";

export const createCategorySchema = z.object({
  key: z.string().min(1).max(100).regex(keyPattern, keyMessage),
  name_en: z.string().min(1).max(200),
  name_ru: z.string().min(1).max(200),
  name_am: z.string().max(200).optional(),
  icon: z.string().max(255).optional(),
});

export const updateCategorySchema = z.object({
  key: z.string().min(1).max(100).regex(keyPattern, keyMessage).optional(),
  name_en: z.string().min(1).max(200).optional(),
  name_ru: z.string().min(1).max(200).optional(),
  name_am: z.string().max(200).optional().nullable(),
  icon: z.string().max(255).optional().nullable(),
});

export const createSubcategorySchema = z.object({
  key: z.string().min(1).max(100).regex(keyPattern, keyMessage),
  name_en: z.string().min(1).max(200),
  name_ru: z.string().min(1).max(200),
  name_am: z.string().max(200).optional(),
});

export const updateSubcategorySchema = z.object({
  key: z.string().min(1).max(100).regex(keyPattern, keyMessage).optional(),
  name_en: z.string().min(1).max(200).optional(),
  name_ru: z.string().min(1).max(200).optional(),
  name_am: z.string().max(200).optional().nullable(),
});

export const createSubSubcategorySchema = createSubcategorySchema;
export const updateSubSubcategorySchema = updateSubcategorySchema;
