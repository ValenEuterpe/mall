import { NextResponse } from "next/server";
import { generateTemplateFile } from "@/lib/excel/generate";

export function generateImportTemplate(shopName: string): NextResponse {
  const headers = [
    "name",
    "description",
    "price",
    "stock",
    "sku",
    "barcode",
    "brand",
    "category",
    "status",
  ];

  const sampleData = {
    name: "Sample Product",
    description: "Product description goes here",
    price: 99.99,
    stock: 100,
    sku: "SKU-001",
    barcode: "1234567890123",
    brand: "Brand Name",
    category: "Electronics",
    status: "DRAFT",
  };

  const buffer = generateTemplateFile(headers, "Products", sampleData);

  const safeShopName = shopName
    .replace(/[^a-zA-Z0-9]/g, "-")
    .toLowerCase()
    .slice(0, 30);
  const filename = `product-import-template-${safeShopName}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length.toString(),
    },
  });
}
