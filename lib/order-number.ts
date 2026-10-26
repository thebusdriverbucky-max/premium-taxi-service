import { db } from "@/lib/db";

/**
 * Generates a unique order number in the format #YYYY-XXXXXX
 * where YYYY is the current UTC year and XXXXXX is a sequential number.
 * The sequence is a per-year counter incremented atomically in the database,
 * so concurrent bookings can never receive the same number.
 */
export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getUTCFullYear();

  const [counter] = await db.$queryRaw<{ value: number }[]>`
    INSERT INTO "TripNumberCounter" ("year", "value", "updatedAt")
    VALUES (${year}, 1, NOW() AT TIME ZONE 'UTC')
    ON CONFLICT ("year") DO UPDATE
    SET "value" = "TripNumberCounter"."value" + 1,
        "updatedAt" = NOW() AT TIME ZONE 'UTC'
    RETURNING "value"
  `;

  return `#${year}-${counter.value.toString().padStart(6, "0")}`;
}
