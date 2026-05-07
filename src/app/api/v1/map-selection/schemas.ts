import { z } from "zod";

export const mapSelectionPayloadSchema = z.object({
  productIds: z.array(z.string().min(1)).default([]),
});

export type MapSelectionPayload = z.infer<typeof mapSelectionPayloadSchema>;
