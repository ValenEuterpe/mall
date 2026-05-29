import { z } from "zod";

export const shopGenerateSchema = z.object({
    venue: z.string().min(1, "Venue is required"),
    building: z.string().optional(),
    floor: z.string().optional(),
    floorId: z.string().optional(),
    shopTypeId: z.string().optional(),
    startNumber: z.number().int().positive(),
    count: z.number().int().positive().max(100, "Maximum 100 shops at once"),
    numberDigits: z.number().int().min(1).max(6).optional(),
});

const contactTypeValues = [
    "PHONE", "EMAIL", "WHATSAPP", "TELEGRAM", "INSTAGRAM",
    "FACEBOOK", "VK", "TIKTOK", "YOUTUBE", "SNAPCHAT", "X_TWITTER",
] as const;

export const shopContactSchema = z.object({
    type: z.enum(contactTypeValues),
    value: z.string().min(1),
    label: z.string().optional(),
});

export const shopUpdateSchema = z.object({
    fullCode: z.string().optional(),
    shopName: z.string().min(2).optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    svgId: z.string().optional().nullable(),
    shopTypeId: z.string().optional().nullable(),
    coordinates: z.object({ x: z.number(), y: z.number() }).optional(),
    openingHours: z.record(z.string(), z.string()).optional(),
    isActive: z.boolean().optional(),
    contacts: z.array(shopContactSchema).max(20).optional(),
});

export type ShopGenerateInput = z.infer<typeof shopGenerateSchema>;
export type ShopUpdateInput = z.infer<typeof shopUpdateSchema>;