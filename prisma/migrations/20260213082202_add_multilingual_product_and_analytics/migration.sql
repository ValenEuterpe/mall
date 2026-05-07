-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "name_am" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "description_am" TEXT,
ADD COLUMN     "description_en" TEXT,
ADD COLUMN     "description_ru" TEXT,
ADD COLUMN     "detailDescription_am" TEXT,
ADD COLUMN     "detailDescription_en" TEXT,
ADD COLUMN     "detailDescription_ru" TEXT,
ADD COLUMN     "name_am" TEXT,
ADD COLUMN     "name_en" TEXT,
ADD COLUMN     "name_ru" TEXT,
ADD COLUMN     "subSubcategoryId" TEXT;

-- AlterTable
ALTER TABLE "subcategories" ADD COLUMN     "name_am" TEXT;

-- CreateTable
CREATE TABLE "product_views" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_subcategories" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ru" TEXT NOT NULL,
    "name_am" TEXT,
    "subcategoryId" TEXT NOT NULL,

    CONSTRAINT "sub_subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_views_productId_idx" ON "product_views"("productId");

-- CreateIndex
CREATE INDEX "product_views_productId_viewedAt_idx" ON "product_views"("productId", "viewedAt");

-- CreateIndex
CREATE INDEX "product_views_viewedAt_idx" ON "product_views"("viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "sub_subcategories_key_key" ON "sub_subcategories"("key");

-- CreateIndex
CREATE INDEX "sub_subcategories_subcategoryId_idx" ON "sub_subcategories"("subcategoryId");

-- CreateIndex
CREATE INDEX "products_subcategoryId_idx" ON "products"("subcategoryId");

-- CreateIndex
CREATE INDEX "products_subSubcategoryId_idx" ON "products"("subSubcategoryId");

-- CreateIndex
CREATE INDEX "products_sku_idx" ON "products"("sku");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_subSubcategoryId_fkey" FOREIGN KEY ("subSubcategoryId") REFERENCES "sub_subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_views" ADD CONSTRAINT "product_views_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_subcategories" ADD CONSTRAINT "sub_subcategories_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "subcategories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
