import { z } from "zod";
import { PAGINATION_DEFAULTS } from "./constants";

export const paginationSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1, "Page must be at least 1")
    .default(PAGINATION_DEFAULTS.PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(
      PAGINATION_DEFAULTS.MIN_LIMIT,
      `Limit must be at least ${PAGINATION_DEFAULTS.MIN_LIMIT}`
    )
    .max(
      PAGINATION_DEFAULTS.MAX_LIMIT,
      `Limit cannot exceed ${PAGINATION_DEFAULTS.MAX_LIMIT}`
    )
    .default(PAGINATION_DEFAULTS.LIMIT),
});

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(PAGINATION_DEFAULTS.MIN_LIMIT)
    .max(PAGINATION_DEFAULTS.MAX_LIMIT)
    .default(PAGINATION_DEFAULTS.LIMIT),
  direction: z.enum(["forward", "backward"]).default("forward"),
});
