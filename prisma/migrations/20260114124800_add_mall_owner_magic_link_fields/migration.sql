-- AlterTable
ALTER TABLE "mall_owners" ADD COLUMN     "lastMagicLinkRequestIp" TEXT,
ADD COLUMN     "lastMagicLinkRequestedAt" TIMESTAMP(3);
