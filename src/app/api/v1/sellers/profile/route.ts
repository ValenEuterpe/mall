/**
 * Seller Profile API
 * 
 * GET /api/v1/sellers/profile - Get current seller's profile
 * PATCH /api/v1/sellers/profile - Update current seller's profile
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/db/prisma";
import { successResponse, methodNotAllowed } from "@/lib/api/response";
import { logger } from "@/lib/utils/logger";

// Profile update schema - only editable fields
// Note: email and shops are read-only (managed by mall owner)
const profileUpdateSchema = z.object({
    businessName: z.string().min(1).max(200).optional(),
    contactPerson: z.string().max(100).optional(),
    phone: z.string().max(20).optional(),
    description: z.string().max(1000).optional(),
    logoUrl: z.string().url().optional().nullable(),
    bannerUrl: z.string().url().optional().nullable(),
    socialLinks: z.object({
        instagram: z.string().optional(),
        telegram: z.string().optional(),
        whatsapp: z.string().optional(),
        email: z.string().email().optional(),
    }).optional(),
});

/**
 * GET /api/v1/sellers/profile
 * 
 * Returns the authenticated seller's profile.
 */
export const GET = withAuth(
    async (request: NextRequest, { user }) => {
        const seller = await prisma.seller.findUnique({
            where: { id: user.userId },
            include: {
                shops: {
                    select: {
                        id: true,
                        fullCode: true,
                        shopName: true,
                        floor: true,
                        building: true,
                        venue: true,
                    },
                },
            },
        });

        if (!seller) {
            return NextResponse.json(
                { success: false, error: { code: "NOT_FOUND", message: "Seller profile not found" } },
                { status: 404 }
            );
        }

        return successResponse({
            id: seller.id,
            // Editable fields
            businessName: seller.businessName,
            contactPerson: seller.contactPerson,
            phone: seller.phone,
            description: seller.description,
            logoUrl: seller.logoUrl,
            bannerUrl: seller.bannerUrl,
            socialLinks: seller.socialLinks,
            // Read-only fields
            email: seller.email,
            shops: seller.shops.map(shop => ({
                id: shop.id,
                code: shop.fullCode,
                name: shop.shopName,
                floor: shop.floor,
                building: shop.building,
                venue: shop.venue,
            })),
            // Metadata
            isVerified: seller.isVerified,
            isActive: seller.isActive,
            createdAt: seller.createdAt,
            lastLoginAt: seller.lastLoginAt,
        });
    },
    { roles: ["SELLER"] }
);

/**
 * PATCH /api/v1/sellers/profile
 * 
 * Updates the authenticated seller's profile.
 * Only certain fields can be modified (not email or shops).
 */
export const PATCH = withAuth(
    async (request: NextRequest, { user }) => {
        // Parse and validate request body
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: { code: "INVALID_JSON", message: "Invalid JSON in request body" } },
                { status: 400 }
            );
        }

        const parsed = profileUpdateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: { 
                        code: "VALIDATION_ERROR", 
                        message: "Invalid request body",
                        details: parsed.error.flatten().fieldErrors,
                    } 
                },
                { status: 400 }
            );
        }

        const data = parsed.data;

        // Check seller exists
        const existingSeller = await prisma.seller.findUnique({
            where: { id: user.userId },
            select: { id: true },
        });

        if (!existingSeller) {
            return NextResponse.json(
                { success: false, error: { code: "NOT_FOUND", message: "Seller profile not found" } },
                { status: 404 }
            );
        }

        // Update profile
        const updatedSeller = await prisma.seller.update({
            where: { id: user.userId },
            data: {
                ...(data.businessName !== undefined && { businessName: data.businessName }),
                ...(data.contactPerson !== undefined && { contactPerson: data.contactPerson }),
                ...(data.phone !== undefined && { phone: data.phone }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
                ...(data.bannerUrl !== undefined && { bannerUrl: data.bannerUrl }),
                ...(data.socialLinks !== undefined && { socialLinks: data.socialLinks }),
            },
            select: {
                id: true,
                businessName: true,
                contactPerson: true,
                phone: true,
                description: true,
                logoUrl: true,
                bannerUrl: true,
                socialLinks: true,
            },
        });

        logger.info("Seller profile updated", {
            sellerId: existingSeller.id,
            updatedFields: Object.keys(data),
        });

        return successResponse({
            ...updatedSeller,
            message: "Profile updated successfully",
        });
    },
    { roles: ["SELLER"] }
);

// Only GET and PATCH are allowed
export const POST = () => methodNotAllowed(["GET", "PATCH"]);
export const PUT = () => methodNotAllowed(["GET", "PATCH"]);
export const DELETE = () => methodNotAllowed(["GET", "PATCH"]);
