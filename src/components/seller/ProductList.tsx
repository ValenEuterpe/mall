"use client";

import { useTranslations } from "next-intl";
import { Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// This is a placeholder component - the main products list is in the products page
// This component can be used for embedding product lists in other pages (e.g., dashboard)

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: string;
}

interface ProductListProps {
  products: Product[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export function ProductList({ products, isLoading, emptyMessage }: ProductListProps) {
  const t = useTranslations("seller.products");

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t("loading")}
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            {emptyMessage || t("noProducts")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {products.map((product) => (
            <li key={product.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-muted-foreground">
                  {product.price.toLocaleString()} ֏ · {t("stock")}: {product.stock}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{product.status}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
