-- Add the CMS, tariff, and driver fields that are present in schema.prisma but
-- were not represented in the versioned migration history. All additions are
-- nullable or have defaults so existing buyer data remains valid.

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "airportSurcharge" DOUBLE PRECISION NOT NULL DEFAULT 5,
ADD COLUMN     "childSeatFee" DOUBLE PRECISION NOT NULL DEFAULT 5,
ADD COLUMN     "luggageFee" DOUBLE PRECISION NOT NULL DEFAULT 5,
ADD COLUMN     "service1Text" TEXT DEFAULT 'Seamless pickups and drop-offs at the airport. We track your flight to ensure we''re there when you land.',
ADD COLUMN     "service1Title" TEXT DEFAULT 'Airport Transfers',
ADD COLUMN     "service2Text" TEXT DEFAULT 'Comfortable travel within the city. Whether it''s for business, shopping, or dining, we get you there in style.',
ADD COLUMN     "service2Title" TEXT DEFAULT 'City Rides',
ADD COLUMN     "service3Text" TEXT DEFAULT 'Need a car for a few hours? Book our hourly service for flexible travel with a dedicated driver at your disposal.',
ADD COLUMN     "service3Title" TEXT DEFAULT 'Hourly Service',
ADD COLUMN     "servicesSubtitle" TEXT DEFAULT 'Professional transfers tailored to your needs',
ADD COLUMN     "servicesTitle" TEXT DEFAULT 'Our Services',
ADD COLUMN     "statsBar1Label" TEXT DEFAULT 'Trips Completed',
ADD COLUMN     "statsBar1Value" TEXT DEFAULT '1,200+',
ADD COLUMN     "statsBar2Label" TEXT DEFAULT 'Happy Clients',
ADD COLUMN     "statsBar2Value" TEXT DEFAULT '950+',
ADD COLUMN     "statsBar3Label" TEXT DEFAULT 'Years of Service',
ADD COLUMN     "statsBar3Value" TEXT DEFAULT '5+',
ADD COLUMN     "statsBar4Label" TEXT DEFAULT 'Rating',
ADD COLUMN     "statsBar4Value" TEXT DEFAULT '4.9 ★';

-- AlterTable
ALTER TABLE "TariffPlan" ADD COLUMN     "minPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "zones" JSONB;

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "driverId" TEXT;

-- CreateTable
CREATE TABLE "FaqItem" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT DEFAULT 'General',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "photoUrl" TEXT,
    "licenseNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FaqItem_isVisible_idx" ON "FaqItem"("isVisible");

-- CreateIndex
CREATE INDEX "FaqItem_sortOrder_idx" ON "FaqItem"("sortOrder");

-- CreateIndex
CREATE INDEX "Driver_isActive_idx" ON "Driver"("isActive");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
