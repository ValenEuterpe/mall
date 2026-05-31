import { z } from "zod";

export const updateMallAboutSchema = z.object({
  description_en: z.string().max(5000).optional().nullable(),
  description_ru: z.string().max(5000).optional().nullable(),
  description_am: z.string().max(5000).optional().nullable(),
  workingHours: z.string().max(500).optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  contactEmail: z
    .string()
    .email()
    .max(200)
    .optional()
    .nullable()
    .or(z.literal("")),
  logoUrl: z.string().url().max(500).optional().nullable().or(z.literal("")),
  socialLinks: z
    .object({
      instagram: z.string().url().max(300).optional().or(z.literal("")),
      facebook: z.string().url().max(300).optional().or(z.literal("")),
      telegram: z.string().url().max(300).optional().or(z.literal("")),
    })
    .optional()
    .nullable(),
  policies_en: z.string().max(10000).optional().nullable(),
  policies_ru: z.string().max(10000).optional().nullable(),
  policies_am: z.string().max(10000).optional().nullable(),
});

export type UpdateMallAboutInput = z.infer<typeof updateMallAboutSchema>;
