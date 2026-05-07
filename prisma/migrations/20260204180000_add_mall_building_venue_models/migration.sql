-- CreateTable
CREATE TABLE "malls" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "malls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" TEXT NOT NULL,
    "mallId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" TEXT NOT NULL,
    "mallId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "svgUrl" TEXT,
    "shopIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Modify floor_maps to use buildingId instead of venue/building/floor strings
ALTER TABLE "floor_maps" DROP CONSTRAINT IF EXISTS "floor_maps_venue_building_floor_key";
ALTER TABLE "floor_maps" DROP COLUMN IF EXISTS "venue";
ALTER TABLE "floor_maps" DROP COLUMN IF EXISTS "building";

-- Add new columns to floor_maps
ALTER TABLE "floor_maps" ADD COLUMN IF NOT EXISTS "buildingId" TEXT;
ALTER TABLE "floor_maps" ADD COLUMN IF NOT EXISTS "floorLabel" TEXT;
ALTER TABLE "floor_maps" ADD COLUMN IF NOT EXISTS "shopIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Change floor column type from TEXT to INT (if it was TEXT)
ALTER TABLE "floor_maps" ALTER COLUMN "floor" TYPE INTEGER USING floor::integer;

-- CreateIndex
CREATE UNIQUE INDEX "buildings_mallId_code_key" ON "buildings"("mallId", "code");

-- CreateIndex
CREATE INDEX "buildings_mallId_idx" ON "buildings"("mallId");

-- CreateIndex
CREATE UNIQUE INDEX "venues_mallId_code_key" ON "venues"("mallId", "code");

-- CreateIndex
CREATE INDEX "venues_mallId_idx" ON "venues"("mallId");

-- CreateIndex
CREATE INDEX "floor_maps_buildingId_idx" ON "floor_maps"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "floor_maps_buildingId_floor_key" ON "floor_maps"("buildingId", "floor");

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_mallId_fkey" FOREIGN KEY ("mallId") REFERENCES "malls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_mallId_fkey" FOREIGN KEY ("mallId") REFERENCES "malls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floor_maps" ADD CONSTRAINT "floor_maps_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
