import assert from "node:assert/strict";
import test from "node:test";

import { Prisma } from "@prisma/client";

import { getAdminAnalytics } from "./admin-analytics";

type AnalyticsClient = Parameters<typeof getAdminAnalytics>[0];

const NOW = new Date("2026-10-26T13:55:00.000Z");

function createClient(overrides: {
  completedSum?: Prisma.Decimal | null;
  completedCount?: number;
  revenueRows?: { week: string; revenue: Prisma.Decimal }[];
  routeRows?: { pickupAddress: string; dropoffAddress: string; _count: { _all: number } }[];
  onCall?: (name: string) => Promise<void>;
} = {}) {
  const calls: Record<string, unknown[]> = {};
  const record = async (name: string, arg?: unknown) => {
    (calls[name] ??= []).push(arg);
    await overrides.onCall?.(name);
  };

  const client = {
    trip: {
      count: async (arg?: unknown) => {
        await record("count", arg);
        return arg ? 7 : 42;
      },
      aggregate: async (arg: unknown) => {
        await record("aggregate", arg);
        return {
          _count: { _all: overrides.completedCount ?? 3 },
          _sum: { total: overrides.completedSum === undefined ? new Prisma.Decimal("10.01") : overrides.completedSum },
        };
      },
      groupBy: async (arg: { by: string[] }) => {
        await record(`groupBy:${arg.by.join(",")}`, arg);
        if (arg.by[0] === "status") {
          return [
            { status: "COMPLETED", _count: 3 },
            { status: "PENDING", _count: 4 },
          ];
        }
        return overrides.routeRows ?? [];
      },
    },
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      await record("queryRaw", { sql: strings.join("?"), values });
      return overrides.revenueRows ?? [];
    },
  };

  return { client: client as unknown as AnalyticsClient, calls };
}

test("getAdminAnalytics keeps the response shape, number types and rounding", async () => {
  const { client } = createClient({
    revenueRows: [
      { week: "2026-10-12", revenue: new Prisma.Decimal("1234.50") },
      { week: "2026-10-19", revenue: new Prisma.Decimal("0") },
    ],
    routeRows: [
      { pickupAddress: "Airport", dropoffAddress: "Hotel", _count: { _all: 9 } },
      { pickupAddress: "Hotel", dropoffAddress: "Airport", _count: { _all: 4 } },
    ],
  });

  const result = await getAdminAnalytics(client, NOW);

  assert.deepEqual(result, {
    totalTrips: 42,
    completedTrips: 3,
    totalRevenue: 10.01,
    avgTripValue: 3.34,
    tripsThisMonth: 7,
    tripsByStatus: [
      { status: "COMPLETED", count: 3 },
      { status: "PENDING", count: 4 },
    ],
    revenueByWeek: [
      { week: "2026-10-12", revenue: 1234.5 },
      { week: "2026-10-19", revenue: 0 },
    ],
    popularRoutes: [
      { name: "Airport → Hotel", count: 9 },
      { name: "Hotel → Airport", count: 4 },
    ],
  });
});

test("getAdminAnalytics returns zeros when there are no completed trips", async () => {
  const { client } = createClient({ completedSum: null, completedCount: 0 });

  const result = await getAdminAnalytics(client, NOW);

  assert.equal(result.totalRevenue, 0);
  assert.equal(result.avgTripValue, 0);
  assert.deepEqual(result.revenueByWeek, []);
  assert.deepEqual(result.popularRoutes, []);
});

test("getAdminAnalytics aggregates in the database with a bounded, deterministic top-5", async () => {
  const { client, calls } = createClient();

  await getAdminAnalytics(client, NOW);

  assert.deepEqual(calls["groupBy:pickupAddress,dropoffAddress"], [
    {
      by: ["pickupAddress", "dropoffAddress"],
      _count: { _all: true },
      orderBy: [
        { _count: { pickupAddress: "desc" } },
        { pickupAddress: "asc" },
        { dropoffAddress: "asc" },
      ],
      take: 5,
    },
  ]);

  const [{ sql, values }] = calls.queryRaw as { sql: string; values: unknown[] }[];
  assert.match(sql, /date_trunc\('week', "createdAt"\)/);
  assert.match(sql, /SUM\("total"\)/);
  assert.equal(values[0], "COMPLETED");
  assert.deepEqual(values[1], new Date("2026-08-31T13:55:00.000Z"));
});

test("getAdminAnalytics runs its queries in parallel", async () => {
  const expectedQueries = 6;
  let started = 0;
  let release!: () => void;
  const allStarted = new Promise<void>((resolve) => {
    release = resolve;
  });

  const { client } = createClient({
    onCall: async () => {
      started += 1;
      if (started === expectedQueries) release();
      await allStarted;
    },
  });

  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("queries did not start concurrently")), 1000).unref();
  });

  await Promise.race([getAdminAnalytics(client, NOW), timeout]);
  assert.equal(started, expectedQueries);
});
