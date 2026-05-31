import { z } from "zod";

export const sellerProfileUpdateSchema = z.object({
  businessName: z.string().min(2).optional(),
  contactPerson: z.string().min(2).optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/)
    .optional(),
  description: z.string().max(500).optional(),
  logoUrl: z.url().optional(),
  bannerUrl: z.url().optional(),
  socialLinks: z
    .object({
      instagram: z.string().optional(),
      telegram: z.string().optional(),
      whatsapp: z.string().optional(),
      email: z.email().optional(),
    })
    .optional(),
});

export type SellerProfileUpdateInput = z.infer<
  typeof sellerProfileUpdateSchema
>;
