import { z } from "zod";

export const productRowSchema = z.object({
    name: z.union([z.string(), z.number(), z.null()]).optional(),
    description: z.union([z.string(), z.number(), z.null()]).optional(),
    price: z.union([z.string(), z.number(), z.null()]).optional(),
    stock: z.union([z.string(), z.number(), z.null()]).optional(),
    brand: z.union([z.string(), z.number(), z.null()]).optional(),
    barcode: z.union([z.string(), z.number(), z.null()]).optional(),
    sku: z.union([z.string(), z.number(), z.null()]).optional(),
    category: z.union([z.string(), z.number(), z.null()]).optional(),
    status: z.union([z.string(), z.null()]).optional(),
}).passthrough();