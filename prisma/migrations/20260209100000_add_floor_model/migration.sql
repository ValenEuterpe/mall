-- CreateTable: floors
CREATE TABLE "floors" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "label" TEXT,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "floors_buildingId_idx" ON "floors"("buildingId");
CREATE UNIQUE INDEX "floors_buildingId_number_key" ON "floors"("buildingId", "number");
CREATE UNIQUE INDEX "floors_buildingId_code_key" ON "floors"("buildingId", "code");

-- AddForeignKey
ALTER TABLE "floors" ADD CONSTRAINT "floors_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing floor_maps data: Create floor records for each existing floor_map
INSERT INTO "floors" ("id", "buildingId", "number", "label", "code", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    "buildingId",
    "floor",
    "floorLabel",
    'F' || "floor",
    "createdAt",
    "updatedAt"
FROM "floor_maps";

-- Add floorId column to floor_maps (nullable first)
ALTER TABLE "floor_maps" ADD COLUMN "floorId" TEXT;

-- Update floor_maps to reference the new floor records
UPDATE "floor_maps" fm
SET "floorId" = f."id"
FROM "floors" f
WHERE fm."buildingId" = f."buildingId" AND fm."floor" = f."number";

-- Make floorId required and add constraint
ALTER TABLE "floor_maps" ALTER COLUMN "floorId" SET NOT NULL;

-- CreateIndex for floor_maps
CREATE UNIQUE INDEX "floor_maps_floorId_key" ON "floor_maps"("floorId");
CREATE INDEX "floor_maps_floorId_idx" ON "floor_maps"("floorId");

-- AddForeignKey
ALTER TABLE "floor_maps" ADD CONSTRAINT "floor_maps_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "floors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old columns and indexes from floor_maps
DROP INDEX IF EXISTS "floor_maps_buildingId_idx";
DROP INDEX IF EXISTS "floor_maps_buildingId_floor_key";
ALTER TABLE "floor_maps" DROP CONSTRAINT IF EXISTS "floor_maps_buildingId_fkey";
ALTER TABLE "floor_maps" DROP COLUMN "buildingId";
ALTER TABLE "floor_maps" DROP COLUMN "floor";
ALTER TABLE "floor_maps" DROP COLUMN "floorLabel";

-- Add floorId to shops (optional)
ALTER TABLE "shops" ADD COLUMN "floorId" TEXT;
CREATE INDEX "shops_floorId_idx" ON "shops"("floorId");
ALTER TABLE "shops" ADD CONSTRAINT "shops_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "floors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
