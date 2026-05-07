import { z } from "zod";

export const shopListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sort: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  venue: z.string().optional(),
  building: z.string().optional(),
  floor: z.string().optional(),
});

export type ShopListQuery = z.infer<typeof shopListQuerySchema>;
