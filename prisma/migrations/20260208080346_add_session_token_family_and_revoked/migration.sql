-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "isRevoked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tokenFamily" TEXT;

-- CreateIndex
CREATE INDEX "sessions_tokenFamily_idx" ON "sessions"("tokenFamily");
