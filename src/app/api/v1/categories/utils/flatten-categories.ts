import { FormattedCategory } from "../types";

interface FlatCategory {
    id: string;
    key: string;
    name: string;
    icon?: string | null;
    productCount?: number;
    type: "category" | "subcategory";
    parentKey?: string;
    parentId?: string;
}

export function flattenCategories(
    categories: FormattedCategory[]
): FlatCategory[] {
    const flat: FlatCategory[] = [];

    for (const category of categories) {
        flat.push({
            id: category.id,
            key: category.key,
            name: category.name,
            icon: category.icon,
            productCount: category.productCount,
            type: "category",
        });

        for (const sub of category.subcategories) {
            flat.push({
                id: sub.id,
                key: sub.key,
                name: sub.name,
                productCount: sub.productCount,
                type: "subcategory",
                parentKey: category.key,
                parentId: category.id,
            });
        }
    }

    return flat;
}