/*
  Warnings:

  - You are about to drop the column `rotation` on the `venues` table. All the data in the column will be lost.
  - You are about to drop the column `scale` on the `venues` table. All the data in the column will be lost.
  - You are about to drop the column `shopIds` on the `venues` table. All the data in the column will be lost.
  - You are about to drop the column `svgUrl` on the `venues` table. All the data in the column will be lost.
  - You are about to drop the column `wayfindingData` on the `venues` table. All the data in the column will be lost.
  - Added the required column `venueId` to the `buildings` table without a default value. This is not possible if the table is not empty.

*/

-- Clean up existing data (dev environment only)
-- This removes all structure data so we can apply the new hierarchy cleanly
DELETE FROM "floor_maps";
DELETE FROM "shops";
DELETE FROM "floors";
DELETE FROM "buildings";
DELETE FROM "venues";

-- AlterTable
ALTER TABLE "buildings" ADD COLUMN     "venueId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "venues" DROP COLUMN "rotation",
DROP COLUMN "scale",
DROP COLUMN "shopIds",
DROP COLUMN "svgUrl",
DROP COLUMN "wayfindingData";

-- CreateIndex
CREATE INDEX "buildings_venueId_idx" ON "buildings"("venueId");

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
