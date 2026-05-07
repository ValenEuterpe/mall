/*
  Warnings:

  - A unique constraint covering the columns `[sku]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `product_discounts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "icon" TEXT;

-- AlterTable
ALTER TABLE "product_discounts" ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "sku" TEXT,
ADD COLUMN     "specifications" JSONB,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "weight" DECIMAL(10,2);

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");
