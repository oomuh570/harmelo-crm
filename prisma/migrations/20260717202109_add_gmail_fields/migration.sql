-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gmailConnected" BOOLEAN DEFAULT false,
ADD COLUMN     "gmailLastSync" TIMESTAMP(3),
ADD COLUMN     "gmailRefreshToken" TEXT;
