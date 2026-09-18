-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "reengagementSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Appointment_clientEmail_idx" ON "Appointment"("clientEmail");

