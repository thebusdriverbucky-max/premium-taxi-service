-- CreateTable
CREATE TABLE "TaxiReview" (
    "id" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorImage" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "content" TEXT NOT NULL,
    "tripType" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxiReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaxiReview_isApproved_idx" ON "TaxiReview"("isApproved");
