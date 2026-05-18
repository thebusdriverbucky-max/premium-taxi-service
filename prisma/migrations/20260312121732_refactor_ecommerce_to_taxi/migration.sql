/*
  Warnings:

  - You are about to drop the column `enabledCategories` on the `StoreSettings` table. All the data in the column will be lost.
  - You are about to drop the column `enabledCountries` on the `StoreSettings` table. All the data in the column will be lost.
  - You are about to drop the column `freeShippingThreshold` on the `StoreSettings` table. All the data in the column will be lost.
  - You are about to drop the column `shippingCost` on the `StoreSettings` table. All the data in the column will be lost.
  - You are about to drop the column `storeName` on the `StoreSettings` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Trip` table. All the data in the column will be lost.
  - You are about to drop the `Cart` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventoryAlert` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Order` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrderItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Review` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Wishlist` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[tripNumber]` on the table `Trip` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "TripStatus" ADD VALUE 'REFUNDED';

-- DropForeignKey
ALTER TABLE "InventoryAlert" DROP CONSTRAINT "InventoryAlert_productId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_billingAddressId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_shippingAddressId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_productId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_userId_fkey";

-- DropForeignKey
ALTER TABLE "Wishlist" DROP CONSTRAINT "Wishlist_productId_fkey";

-- DropForeignKey
ALTER TABLE "Wishlist" DROP CONSTRAINT "Wishlist_userId_fkey";

-- AlterTable
ALTER TABLE "StoreSettings" DROP COLUMN "enabledCategories",
DROP COLUMN "enabledCountries",
DROP COLUMN "freeShippingThreshold",
DROP COLUMN "shippingCost",
DROP COLUMN "storeName",
ADD COLUMN     "baseCity" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "googleMapsApiKey" TEXT,
ADD COLUMN     "taxiLicense" TEXT;

-- AlterTable
ALTER TABLE "Trip" DROP COLUMN "price",
ADD COLUMN     "basePrice" DECIMAL(10,2),
ADD COLUMN     "driverName" TEXT,
ADD COLUMN     "driverPhone" TEXT,
ADD COLUMN     "flightNumber" TEXT,
ADD COLUMN     "passengerCount" INTEGER,
ADD COLUMN     "pickupDateTime" TIMESTAMP(3),
ADD COLUMN     "tariffPlanId" TEXT,
ADD COLUMN     "total" DECIMAL(10,2),
ADD COLUMN     "tripNumber" TEXT;

-- DropTable
DROP TABLE "Cart";

-- DropTable
DROP TABLE "InventoryAlert";

-- DropTable
DROP TABLE "Order";

-- DropTable
DROP TABLE "OrderItem";

-- DropTable
DROP TABLE "Product";

-- DropTable
DROP TABLE "Review";

-- DropTable
DROP TABLE "Wishlist";

-- DropEnum
DROP TYPE "OrderStatus";

-- CreateTable
CREATE TABLE "TariffPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "pricePerKm" DECIMAL(10,2) NOT NULL,
    "pricePerMin" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "vehicleType" TEXT,
    "maxPassengers" INTEGER NOT NULL DEFAULT 4,
    "maxLuggage" INTEGER NOT NULL DEFAULT 2,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TariffPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TariffPlan_slug_key" ON "TariffPlan"("slug");

-- CreateIndex
CREATE INDEX "TariffPlan_isActive_idx" ON "TariffPlan"("isActive");

-- CreateIndex
CREATE INDEX "TariffPlan_sortOrder_idx" ON "TariffPlan"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_tripNumber_key" ON "Trip"("tripNumber");

-- CreateIndex
CREATE INDEX "Trip_userId_idx" ON "Trip"("userId");

-- CreateIndex
CREATE INDEX "Trip_status_idx" ON "Trip"("status");

-- CreateIndex
CREATE INDEX "Trip_scheduledAt_idx" ON "Trip"("scheduledAt");

-- CreateIndex
CREATE INDEX "Trip_createdAt_idx" ON "Trip"("createdAt");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_tariffPlanId_fkey" FOREIGN KEY ("tariffPlanId") REFERENCES "TariffPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
