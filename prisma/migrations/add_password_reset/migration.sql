-- Add password reset fields to User table
ALTER TABLE "User" ADD COLUMN "resetToken" TEXT UNIQUE;
ALTER TABLE "User" ADD COLUMN "resetTokenExpiry" TIMESTAMP(3);
