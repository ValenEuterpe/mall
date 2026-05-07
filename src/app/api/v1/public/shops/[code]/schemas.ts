import { z } from "zod";

export const shopCodeSchema = z.string().min(1).max(100);

export const shopProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ShopProductsQuery = z.infer<typeof shopProductsQuerySchema>;
