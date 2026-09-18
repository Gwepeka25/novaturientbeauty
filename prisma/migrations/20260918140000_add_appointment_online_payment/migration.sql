-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "paidOnlineAt" TIMESTAMP(3),
ADD COLUMN     "stripeCheckoutSessionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_stripeCheckoutSessionId_key" ON "Appointment"("stripeCheckoutSessionId");
