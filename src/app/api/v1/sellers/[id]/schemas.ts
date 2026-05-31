import { z } from "zod";

export const sellerUpdateSchema = z.object({
  businessName: z.string().min(1).max(200).optional(),
  contactPerson: z.string().min(1).max(100).optional(),
  phone: z.string().min(1).max(20).optional(),
  description: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
});

export const shopAssignmentSchema = z.object({
  action: z.enum(["assign", "unassign", "reassign"]),
  shopId: z.string().optional(),
  shopIds: z.array(z.string()).optional(),
});

export const verificationSchema = z.object({
  isVerified: z.boolean(),
  notes: z.string().max(500).optional(),
});
