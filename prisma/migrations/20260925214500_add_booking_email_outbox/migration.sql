-- CreateTable
CREATE TABLE "BookingEmailDelivery" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingEmailDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingEmailDelivery_tripId_key" ON "BookingEmailDelivery"("tripId");

-- CreateIndex
CREATE INDEX "BookingEmailDelivery_sentAt_createdAt_idx" ON "BookingEmailDelivery"("sentAt", "createdAt");

-- AddForeignKey
ALTER TABLE "BookingEmailDelivery" ADD CONSTRAINT "BookingEmailDelivery_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
