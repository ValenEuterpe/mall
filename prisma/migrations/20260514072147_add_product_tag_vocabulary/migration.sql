-- AlterTable
ALTER TABLE "products" ADD COLUMN     "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "productType" TEXT;

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ru" TEXT NOT NULL,
    "name_am" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_tags" (
    "productId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_tags_pkey" PRIMARY KEY ("productId","tagId")
);

-- CreateIndex
CREATE INDEX "tags_categoryId_idx" ON "tags"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_categoryId_key_key" ON "tags"("categoryId", "key");

-- CreateIndex
CREATE INDEX "product_tags_tagId_idx" ON "product_tags"("tagId");

-- CreateIndex
CREATE INDEX "product_tags_productId_idx" ON "product_tags"("productId");

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
