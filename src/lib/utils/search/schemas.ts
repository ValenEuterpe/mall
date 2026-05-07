import { z } from "zod";


export const sortSchema = z.object({
    field: z.string().min(1).max(50).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
    order: z.enum(["asc", "desc"]),
});