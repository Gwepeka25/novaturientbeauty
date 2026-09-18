-- CreateTable
CREATE TABLE "Workshop" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "format" TEXT NOT NULL,
    "location" TEXT,
    "capacity" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workshop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopRegistration" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientPhone" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "cashPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidOnlineAt" TIMESTAMP(3),
    "stripeCheckoutSessionId" TEXT,
    "manageToken" TEXT NOT NULL,
    "manageTokenExp" TIMESTAMP(3) NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkshopRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Workshop_startsAt_idx" ON "Workshop"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopRegistration_stripeCheckoutSessionId_key" ON "WorkshopRegistration"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopRegistration_manageToken_key" ON "WorkshopRegistration"("manageToken");

-- CreateIndex
CREATE INDEX "WorkshopRegistration_workshopId_idx" ON "WorkshopRegistration"("workshopId");

-- CreateIndex
CREATE INDEX "WorkshopRegistration_clientEmail_idx" ON "WorkshopRegistration"("clientEmail");

-- AddForeignKey
ALTER TABLE "WorkshopRegistration" ADD CONSTRAINT "WorkshopRegistration_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

