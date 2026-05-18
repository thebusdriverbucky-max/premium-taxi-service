-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "heroImageUrl" TEXT;

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "discountAmount" DECIMAL(10,2),
ADD COLUMN     "discountCodeId" TEXT;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
