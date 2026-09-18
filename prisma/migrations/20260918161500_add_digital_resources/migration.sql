-- CreateTable
CREATE TABLE "DigitalResource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "fileName" TEXT NOT NULL,
    "fileMimeType" TEXT NOT NULL,
    "fileData" BYTEA NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalResourcePurchase" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cashPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidOnlineAt" TIMESTAMP(3),
    "stripeCheckoutSessionId" TEXT,
    "downloadToken" TEXT NOT NULL,
    "downloadTokenExp" TIMESTAMP(3) NOT NULL,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DigitalResourcePurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DigitalResourcePurchase_stripeCheckoutSessionId_key" ON "DigitalResourcePurchase"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalResourcePurchase_downloadToken_key" ON "DigitalResourcePurchase"("downloadToken");

-- CreateIndex
CREATE INDEX "DigitalResourcePurchase_resourceId_idx" ON "DigitalResourcePurchase"("resourceId");

-- CreateIndex
CREATE INDEX "DigitalResourcePurchase_clientEmail_idx" ON "DigitalResourcePurchase"("clientEmail");

-- AddForeignKey
ALTER TABLE "DigitalResourcePurchase" ADD CONSTRAINT "DigitalResourcePurchase_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "DigitalResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

