import { z } from "zod";

export const productsBatchRequestSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
});

export type ProductsBatchRequest = z.infer<typeof productsBatchRequestSchema>;
