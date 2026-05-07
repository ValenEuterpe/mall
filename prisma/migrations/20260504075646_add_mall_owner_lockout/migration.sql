/*
  Warnings:

  - You are about to drop the column `advertiserId` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the `advertisements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `advertisers` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContactType" ADD VALUE 'FACEBOOK';
ALTER TYPE "ContactType" ADD VALUE 'VK';
ALTER TYPE "ContactType" ADD VALUE 'TIKTOK';
ALTER TYPE "ContactType" ADD VALUE 'YOUTUBE';
ALTER TYPE "ContactType" ADD VALUE 'SNAPCHAT';
ALTER TYPE "ContactType" ADD VALUE 'X_TWITTER';

-- DropForeignKey
ALTER TABLE "advertisements" DROP CONSTRAINT "advertisements_advertiserId_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_advertiserId_fkey";

-- DropIndex
DROP INDEX "products_barcode_key";

-- DropIndex
DROP INDEX "products_sku_key";

-- DropIndex
DROP INDEX "sessions_advertiserId_idx";

-- AlterTable
ALTER TABLE "floors" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "rotation" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "scale" DOUBLE PRECISION DEFAULT 1;

-- AlterTable
ALTER TABLE "mall_owners" ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "malls" ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "description_am" TEXT,
ADD COLUMN     "description_en" TEXT,
ADD COLUMN     "description_ru" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "policies_am" TEXT,
ADD COLUMN     "policies_en" TEXT,
ADD COLUMN     "policies_ru" TEXT,
ADD COLUMN     "socialLinks" JSONB,
ADD COLUMN     "workingHours" TEXT;

-- AlterTable
ALTER TABLE "product_discounts" ADD COLUMN     "name_am" TEXT,
ADD COLUMN     "name_en" TEXT,
ADD COLUMN     "name_ru" TEXT;

-- AlterTable
ALTER TABLE "sessions" DROP COLUMN "advertiserId";

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "shopTypeId" TEXT;

-- AlterTable
ALTER TABLE "venues" ADD COLUMN     "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "scale" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "shopIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "svgUrl" TEXT,
ADD COLUMN     "wayfindingData" JSONB;

-- DropTable
DROP TABLE "advertisements";

-- DropTable
DROP TABLE "advertisers";

-- DropEnum
DROP TYPE "AdPosition";

-- CreateTable
CREATE TABLE "shop_types" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ru" TEXT NOT NULL,
    "name_am" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "supportsProducts" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "ownerRole" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shop_types_key_key" ON "shop_types"("key");

-- CreateIndex
CREATE INDEX "favorites_ownerId_createdAt_idx" ON "favorites"("ownerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "favorites_productId_idx" ON "favorites"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_ownerId_productId_key" ON "favorites"("ownerId", "productId");

-- CreateIndex
CREATE INDEX "shops_shopTypeId_idx" ON "shops"("shopTypeId");

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_shopTypeId_fkey" FOREIGN KEY ("shopTypeId") REFERENCES "shop_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
