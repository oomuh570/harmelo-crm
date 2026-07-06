-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "followUpStatus" "FollowUpStatus";

-- CreateIndex
CREATE INDEX "Activity_followUpStatus_idx" ON "Activity"("followUpStatus");
