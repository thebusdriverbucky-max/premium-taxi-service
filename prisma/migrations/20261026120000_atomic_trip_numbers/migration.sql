-- CreateTable
CREATE TABLE "TripNumberCounter" (
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripNumberCounter_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE INDEX "Trip_status_createdAt_idx" ON "Trip"("status", "createdAt");

-- Continue numbering from the highest existing "#YYYY-NNNNNN" trip number of each
-- year. Fallback "TRP-..." numbers do not match and are ignored.
INSERT INTO "TripNumberCounter" ("year", "value", "updatedAt")
SELECT
    substring("tripNumber" from 2 for 4)::INTEGER,
    MAX(substring("tripNumber" from 7)::INTEGER),
    CURRENT_TIMESTAMP
FROM "Trip"
WHERE "tripNumber" ~ '^#[0-9]{4}-[0-9]{1,9}$'
GROUP BY substring("tripNumber" from 2 for 4)::INTEGER;
