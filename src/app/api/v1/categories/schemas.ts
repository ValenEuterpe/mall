import { z } from "zod";

export const querySchema = z.object({
  locale: z.enum(["en", "ru"]).optional().default("en"),
  includeEmpty: z.enum(["true", "false"]).optional().default("false"),
  flat: z.enum(["true", "false"]).optional().default("false"),
});
