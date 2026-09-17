-- CreateTable
CREATE TABLE "ClientLoginToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientLoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientLoginToken_token_key" ON "ClientLoginToken"("token");

-- CreateIndex
CREATE INDEX "ClientLoginToken_email_idx" ON "ClientLoginToken"("email");
