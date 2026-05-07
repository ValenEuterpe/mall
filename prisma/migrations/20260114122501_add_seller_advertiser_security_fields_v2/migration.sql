-- AlterTable
ALTER TABLE "advertisers" ADD COLUMN     "failedLoginAttempts" INTEGER DEFAULT 0,
ADD COLUMN     "lastLoginIp" TEXT,
ADD COLUMN     "lockedUntil" TIMESTAMP(3);
