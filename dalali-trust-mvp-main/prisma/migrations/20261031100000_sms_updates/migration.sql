-- CreateEnum
CREATE TYPE "SmsStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "notification" ADD COLUMN     "smsError" TEXT,
ADD COLUMN     "smsSentAt" TIMESTAMPTZ(3),
ADD COLUMN     "smsStatus" "SmsStatus";

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "smsUpdates" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "notification_smsStatus_idx" ON "notification"("smsStatus");
