-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'CASH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('unpaid', 'pending', 'paid', 'failed', 'refunded', 'partially_refunded');

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "bookingRequestId" TEXT,
ADD COLUMN     "dropoffPlaceId" TEXT,
ADD COLUMN     "extras" JSONB,
ADD COLUMN     "paidAmount" DECIMAL(10,2),
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "pickupPlaceId" TEXT,
ADD COLUMN     "pricingBreakdown" JSONB,
ADD COLUMN     "refundedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "stripeCheckoutSessionId" TEXT,
ALTER COLUMN "paymentStatus" DROP DEFAULT,
ALTER COLUMN "paymentStatus" TYPE "PaymentStatus"
USING (
  CASE LOWER("paymentStatus")
    WHEN 'pending' THEN 'pending'::"PaymentStatus"
    WHEN 'paid' THEN 'paid'::"PaymentStatus"
    WHEN 'failed' THEN 'failed'::"PaymentStatus"
    WHEN 'refunded' THEN 'refunded'::"PaymentStatus"
    WHEN 'partially_refunded' THEN 'partially_refunded'::"PaymentStatus"
    ELSE 'unpaid'::"PaymentStatus"
  END
),
ALTER COLUMN "paymentStatus" SET DEFAULT 'unpaid';

-- Older application versions stored Checkout Session IDs in this field.
UPDATE "Trip"
SET "stripeCheckoutSessionId" = "stripePaymentIntentId",
    "stripePaymentIntentId" = NULL
WHERE "stripePaymentIntentId" LIKE 'cs_%';

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StripeWebhookEvent_createdAt_idx" ON "StripeWebhookEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_bookingRequestId_key" ON "Trip"("bookingRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_stripeCheckoutSessionId_key" ON "Trip"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_stripePaymentIntentId_key" ON "Trip"("stripePaymentIntentId");
