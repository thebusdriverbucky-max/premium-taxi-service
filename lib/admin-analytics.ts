// File: lib/admin-analytics.ts

import { Prisma, TripStatus, type PrismaClient } from "@prisma/client";

type AnalyticsClient = Pick<PrismaClient, "trip" | "$queryRaw">;

const REVENUE_WINDOW_MS = 56 * 24 * 60 * 60 * 1000;
const POPULAR_ROUTES_LIMIT = 5;

const toNumber = (value: Prisma.Decimal | null | undefined) =>
  parseFloat(value?.toString() || "0");

export async function getAdminAnalytics(client: AnalyticsClient, now = new Date()) {
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const revenueSince = new Date(now.getTime() - REVENUE_WINDOW_MS);

  const [
    totalTrips,
    completed,
    tripsThisMonth,
    tripsByStatusRaw,
    revenueByWeekRaw,
    popularRoutesRaw,
  ] = await Promise.all([
    client.trip.count(),
    client.trip.aggregate({
      where: { status: TripStatus.COMPLETED },
      _count: { _all: true },
      _sum: { total: true },
    }),
    client.trip.count({ where: { createdAt: { gte: startOfMonth } } }),
    client.trip.groupBy({ by: ["status"], _count: true }),
    // "createdAt" is timestamp(3) without time zone holding UTC, so date_trunc yields UTC Monday weeks.
    // The cutoff is normalised to UTC as well so the comparison never depends on the session time zone.
    client.$queryRaw<{ week: string; revenue: Prisma.Decimal }[]>`
      SELECT to_char(date_trunc('week', "createdAt"), 'YYYY-MM-DD') AS week,
             COALESCE(SUM("total"), 0) AS revenue
      FROM "Trip"
      WHERE "status" = ${TripStatus.COMPLETED}::"TripStatus"
        AND "createdAt" >= (${revenueSince}::timestamptz AT TIME ZONE 'UTC')
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    client.trip.groupBy({
      by: ["pickupAddress", "dropoffAddress"],
      _count: { _all: true },
      orderBy: [
        { _count: { pickupAddress: "desc" } },
        { pickupAddress: "asc" },
        { dropoffAddress: "asc" },
      ],
      take: POPULAR_ROUTES_LIMIT,
    }),
  ]);

  const completedTrips = completed._count._all;
  const totalRevenue = toNumber(completed._sum.total);
  const avgTripValue = completedTrips > 0 ? totalRevenue / completedTrips : 0;

  return {
    totalTrips,
    completedTrips,
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    avgTripValue: parseFloat(avgTripValue.toFixed(2)),
    tripsThisMonth,
    tripsByStatus: tripsByStatusRaw.map((item) => ({
      status: item.status,
      count: item._count,
    })),
    revenueByWeek: revenueByWeekRaw.map((row) => ({
      week: row.week,
      revenue: toNumber(row.revenue),
    })),
    popularRoutes: popularRoutesRaw.map((row) => ({
      name: `${row.pickupAddress} → ${row.dropoffAddress}`,
      count: row._count._all,
    })),
  };
}
