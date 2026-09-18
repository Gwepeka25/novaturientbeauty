-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "calendarFeedToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_calendarFeedToken_key" ON "AdminUser"("calendarFeedToken");

