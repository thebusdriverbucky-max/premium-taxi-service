"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const getMyTrips = async () => {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  const trips = await db.trip.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        ...(session.user.email
          ? [{ userId: null, passengerEmail: session.user.email }]
          : []),
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return trips;
};
