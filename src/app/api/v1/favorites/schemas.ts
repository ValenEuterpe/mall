import { z } from "zod";

export const addFavoriteSchema = z.object({
  productId: z.string().cuid("Invalid product ID format"),
});

export type AddFavoriteInput = z.infer<typeof addFavoriteSchema>;
