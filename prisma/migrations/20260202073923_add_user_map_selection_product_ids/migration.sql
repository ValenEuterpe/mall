-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mapSelectionProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
