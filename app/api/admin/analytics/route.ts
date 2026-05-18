// app/api/admin/analytics/route.ts

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rateLimit = await checkRateLimit(session.user.id!, "admin");
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // 1. Основные показатели
    const totalTrips = await db.trip.count();
    const completedTrips = await db.trip.count({
      where: { status: "COMPLETED" },
    });

    const revenueResult = await db.trip.aggregate({
      where: { status: "COMPLETED" },
      _sum: { total: true },
    });
    const totalRevenue = parseFloat(revenueResult._sum.total?.toString() || "0");

    const avgTripValue = completedTrips > 0 ? totalRevenue / completedTrips : 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const tripsThisMonth = await db.trip.count({
      where: { createdAt: { gte: startOfMonth } },
    });

    // 2. Графики
    // Trips by Status
    const tripsByStatusRaw = await db.trip.groupBy({
      by: ["status"],
      _count: true,
    });
    const tripsByStatus = tripsByStatusRaw.map((item) => ({
      status: item.status,
      count: item._count,
    }));

    // Revenue by Week (last 8 weeks)
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    const weeklyTrips = await db.trip.findMany({
      where: {
        status: "COMPLETED",
        createdAt: { gte: eightWeeksAgo },
      },
      select: {
        total: true,
        createdAt: true,
      },
    });

    const revenueByWeekMap = weeklyTrips.reduce((acc: Record<string, number>, trip) => {
      const date = new Date(trip.createdAt);
      // Get start of week (Monday)
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(date.setDate(diff));
      const weekKey = startOfWeek.toISOString().split('T')[0];

      acc[weekKey] = (acc[weekKey] || 0) + parseFloat(trip.total?.toString() || "0");
      return acc;
    }, {});

    const revenueByWeek = Object.entries(revenueByWeekMap)
      .map(([week, revenue]) => ({ week, revenue }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // Popular Routes
    const allTrips = await db.trip.findMany({
      select: {
        pickupAddress: true,
        dropoffAddress: true,
      },
    });

    const routeCounts = allTrips.reduce((acc: Record<string, number>, trip) => {
      const route = `${trip.pickupAddress} → ${trip.dropoffAddress}`;
      acc[route] = (acc[route] || 0) + 1;
      return acc;
    }, {});

    const popularRoutes = Object.entries(routeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json({
      totalTrips,
      completedTrips,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      avgTripValue: parseFloat(avgTripValue.toFixed(2)),
      tripsThisMonth,
      tripsByStatus,
      revenueByWeek,
      popularRoutes,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
