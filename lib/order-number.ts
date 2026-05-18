import { db } from "@/lib/db";

/**
 * Generates a unique order number in the format #YYYY-XXXXXX
 * where YYYY is the current year and XXXXXX is a sequential number.
 */
export async function generateOrderNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();

  // Find the last trip created in the current year
  const lastTrip = await db.trip.findFirst({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
      },
      tripNumber: {
        startsWith: `#${year}-`,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      tripNumber: true,
    },
  });

  let sequence = 1;

  if (lastTrip && lastTrip.tripNumber) {
    // Extract the sequence number from the last trip number
    // Format: #YYYY-XXXXXX or TRP-XXXXXX
    const parts = lastTrip.tripNumber.split("-");
    if (parts.length === 2) {
      const lastSequence = parseInt(parts[1], 10);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }
  }

  // Pad the sequence with leading zeros to ensure 6 digits
  const paddedSequence = sequence.toString().padStart(6, "0");

  return `#${year}-${paddedSequence}`;
}

