/*
  Warnings:

  - Made the column `buildingId` on table `floor_maps` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "floor_maps" ADD COLUMN     "wayfindingData" JSONB,
ALTER COLUMN "buildingId" SET NOT NULL;

-- AlterTable
ALTER TABLE "venues" ADD COLUMN     "wayfindingData" JSONB;
