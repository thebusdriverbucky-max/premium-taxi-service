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
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return trips;
};
