/*
  Warnings:

  - A unique constraint covering the columns `[externalEmailId]` on the table `Activity` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "externalEmailId" TEXT,
ADD COLUMN     "isAutoLogged" BOOLEAN DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Activity_externalEmailId_key" ON "Activity"("externalEmailId");

-- CreateIndex
CREATE INDEX "Activity_externalEmailId_idx" ON "Activity"("externalEmailId");
