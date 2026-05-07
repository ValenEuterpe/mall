import { z } from "zod";

export const mapCreateSchema = z.object({
    venue: z
        .string()
        .min(1, "Venue is required")
        .max(100, "Venue name too long")
        .trim(),
    building: z
        .string()
        .max(100, "Building name too long")
        .trim()
        .optional()
        .nullable(),
    floor: z
        .string()
        .min(1, "Floor is required")
        .max(50, "Floor name too long")
        .trim(),
    svgUrl: z
        .string()
        .url("Invalid SVG URL")
        .refine(
            (url) => {
                const allowedPatterns = [
                    /^\/uploads\//,
                    /^https?:\/\/[^/]+\.amazonaws\.com\//,
                    /^https?:\/\/[^/]+\.cloudinary\.com\//,
                    /^https?:\/\/localhost/,
                ];
                return allowedPatterns.some((pattern) => pattern.test(url));
            },
            { message: "SVG URL must be from an allowed source" }
        ),
});

export const mapQuerySchema = z.object({
    venue: z.string().min(1, "Venue is required"),
    building: z.string().optional().nullable(),
    floor: z.string().min(1, "Floor is required"),
    includeShops: z.enum(["true", "false"]).optional().default("true"),
    includeVacant: z.enum(["true", "false"]).optional().default("true"),
});
