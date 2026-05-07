import { Prisma } from "@/prisma/generated/client";

type ProductDetail = Prisma.ProductGetPayload<{ select: typeof import("./selects").PRODUCT_DETAIL_SELECT }>;

export function transformProductForList(
    product: Prisma.ProductGetPayload<{ select: typeof import("./selects").PRODUCT_LIST_SELECT }>
) {
    const activeDiscount = product.discounts[0];

    // Calculate effective price
    let effectivePrice = Number(product.basePrice);
    if (activeDiscount) {
        if (activeDiscount.discountType === 'percentage') {
            effectivePrice = effectivePrice * (1 - Number(activeDiscount.discountValue) / 100);
        } else if (activeDiscount.discountType === 'fixed') {
            effectivePrice = effectivePrice - Number(activeDiscount.discountValue);
        }
    }

    return {
        id: product.id,
        name: product.name,
        description: product.description,
        basePrice: product.basePrice,
        effectivePrice: Math.max(0, effectivePrice),
        stockQuantity: product.stockQuantity,
        inStock: product.stockQuantity > 0,
        images: product.images,
        brand: product.brand,
        sku: product.sku,
        isFeatured: product.isFeatured,
        hasDiscount: !!activeDiscount,
        discount: activeDiscount
            ? {
                type: activeDiscount.discountType,
                value: activeDiscount.discountValue,
            }
            : null,
        shop: {
            id: product.shop.id,
            code: product.shop.fullCode,
            name: product.shop.shopName,
            businessName: product.shop.seller?.businessName,
            svgId: product.shop.svgId,
        },
        category: product.category
            ? {
                id: product.category.id,
                key: product.category.key,
                name: {
                    en: product.category.name_en,
                    ru: product.category.name_ru,
                },
            }
            : null,
        subcategory: product.subcategory
            ? {
                id: product.subcategory.id,
                key: product.subcategory.key,
                name: {
                    en: product.subcategory.name_en,
                    ru: product.subcategory.name_ru,
                },
            }
            : null,
    };
}

export function transformProductForDetail(product: ProductDetail) {
    const activeDiscount = product.discounts[0] ?? null;

    let effectivePrice = Number(product.basePrice);
    if (activeDiscount) {
        if (activeDiscount.discountType === 'percentage') {
            effectivePrice = effectivePrice * (1 - Number(activeDiscount.discountValue) / 100);
        } else if (activeDiscount.discountType === 'fixed') {
            effectivePrice = effectivePrice - Number(activeDiscount.discountValue);
        }
        effectivePrice = Math.max(0, effectivePrice);
    }

    return {
        id: product.id,
        name: product.name,
        description: product.description,

        pricing: {
            basePrice: product.basePrice,
            effectivePrice: Number(effectivePrice.toFixed(2)),
            currency: "USD",
            hasDiscount: !!activeDiscount,
            discountInfo: activeDiscount
                ? {
                    type: activeDiscount.discountType,
                    value: activeDiscount.discountValue,
                    validFrom: activeDiscount.startDate,
                    validUntil: activeDiscount.endDate,
                }
                : null,
            tiers: product.priceTiers.map((tier) => ({
                minQuantity: tier.minQuantity,
                maxQuantity: tier.maxQuantity,
                price: tier.price,
            })),
        },

        inventory: {
            stockQuantity: product.stockQuantity,
            inStock: product.stockQuantity > 0,
            barcode: product.barcode,
        },

        images: product.images as string[],
        brand: product.brand,

        shop: {
            id: product.shop.id,
            code: product.shop.fullCode,
            name: product.shop.shopName,
            location: {
                floor: product.shop.floor,
                building: product.shop.building,
                venue: product.shop.venue,
                svgId: product.shop.svgId,
            },
            seller: product.shop.seller
                ? {
                    id: product.shop.seller.id,
                    businessName: product.shop.seller.businessName,
                    phone: product.shop.seller.phone,
                    socialLinks: product.shop.seller.socialLinks as Record<string, unknown> | null,
                    logoUrl: product.shop.seller.logoUrl,
                    description: product.shop.seller.description,
                }
                : null,
            contacts: product.shop.contacts.map((contact) => ({
                type: contact.type,
                value: contact.value,
                label: contact.label,
            })),
            openingHours: product.shop.openingHours as Record<string, unknown> | null,
        },

        category: product.category
            ? {
                id: product.category.id,
                key: product.category.key,
                name: {
                    en: product.category.name_en,
                    ru: product.category.name_ru,
                },
            }
            : null,

        subcategory: product.subcategory
            ? {
                id: product.subcategory.id,
                key: product.subcategory.key,
                name: {
                    en: product.subcategory.name_en,
                    ru: product.subcategory.name_ru,
                },
            }
            : null,

        meta: {
            isFeatured: product.isFeatured,
            createdAt: product.createdAt,
            updatedAt: product.lastUpdated,
        },
    };
}