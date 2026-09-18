-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE "WaitlistEntry" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'en';

