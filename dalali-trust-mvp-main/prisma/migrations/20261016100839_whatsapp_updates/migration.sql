-- CreateEnum
CREATE TYPE "WhatsAppStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "notification" ADD COLUMN     "whatsappError" TEXT,
ADD COLUMN     "whatsappParams" JSONB,
ADD COLUMN     "whatsappSentAt" TIMESTAMPTZ(3),
ADD COLUMN     "whatsappStatus" "WhatsAppStatus",
ADD COLUMN     "whatsappTemplate" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "whatsappUpdates" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "notification_whatsappStatus_idx" ON "notification"("whatsappStatus");
