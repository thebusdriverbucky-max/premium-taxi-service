import assert from "node:assert/strict";
import test from "node:test";

import {
  PaymentMethod,
  PaymentStatus,
  Prisma,
  TripStatus,
  type Trip,
} from "@prisma/client";

import {
  applyTripRefund,
  expireTripPayment,
  markTripPaymentAttemptFailed,
  releaseAbandonedCheckoutTrip,
  releaseAbandonedCheckoutTrips,
  settleTripPaid,
} from "./trip-settlement";

type TripDelegate = Prisma.TransactionClient["trip"];
type BookingEmailDeliveryDelegate = Prisma.TransactionClient["bookingEmailDelivery"];

function createTrip(overrides: Partial<Trip> = {}): Trip {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    id: "trip-1",
    tripNumber: "TRIP-1",
    bookingRequestId: null,
    userId: null,
    pickupAddress: "Pickup",
    dropoffAddress: "Dropoff",
    pickupPlaceId: null,
    dropoffPlaceId: null,
    pickupLat: null,
    pickupLng: null,
    dropoffLat: null,
    dropoffLng: null,
    distance: null,
    duration: null,
    tariffPlanId: null,
    scheduledAt: null,
    completedAt: null,
    pickupDateTime: null,
    passengerName: "Customer",
    passengerPhone: null,
    passengerEmail: "customer@example.com",
    passengerCount: 1,
    flightNumber: null,
    notes: null,
    extras: null,
    basePrice: new Prisma.Decimal("100.00"),
    discountAmount: null,
    discountCodeId: null,
    total: new Prisma.Decimal("100.00"),
    currency: "EUR",
    pricingBreakdown: null,
    status: TripStatus.PENDING,
    stripeCheckoutSessionId: "cs_1",
    stripePaymentIntentId: "pi_1",
    paymentMethod: PaymentMethod.STRIPE,
    paymentStatus: PaymentStatus.PENDING,
    paidAmount: null,
    refundedAmount: new Prisma.Decimal(0),
    paidAt: null,
    refundedAt: null,
    driverName: null,
    driverPhone: null,
    driverId: null,
    vehicleId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function matchesScalar<T>(value: T, filter: unknown): boolean {
  if (filter === undefined) return true;
  if (typeof filter !== "object" || filter === null || filter instanceof Date) {
    return value === filter;
  }

  const condition = filter as {
    in?: T[];
    notIn?: T[];
    not?: T;
    lte?: Prisma.Decimal;
    lt?: Date;
  };
  if (condition.in && !condition.in.includes(value)) return false;
  if (condition.notIn && condition.notIn.includes(value)) return false;
  if (condition.not !== undefined && value === condition.not) return false;
  if (condition.lte && !(value instanceof Prisma.Decimal && value.lte(condition.lte))) {
    return false;
  }
  if (condition.lt && !(value instanceof Date && value < condition.lt)) {
    return false;
  }
  return true;
}

function createSettlementClient(initialTrip: Trip) {
  let trip = { ...initialTrip };
  let successfulUpdates = 0;
  const emailDeliveryTripIds = new Set<string>();

  const matchesWhere = (where: Record<string, unknown>) =>
    Object.entries(where).every(([key, filter]) =>
      matchesScalar(trip[key as keyof Trip], filter));

  const delegate = {
    async findMany(args: { where: Record<string, unknown>; take?: number }) {
      return matchesWhere(args.where) && args.take !== 0 ? [{ id: trip.id }] : [];
    },
    async updateMany(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) {
      if (!matchesWhere(args.where)) return { count: 0 };

      trip = { ...trip, ...args.data, updatedAt: new Date() } as Trip;
      successfulUpdates += 1;
      return { count: 1 };
    },
    async findUnique() {
      return { ...trip, tariffPlan: null };
    },
  } as unknown as TripDelegate;

  const bookingEmailDelivery = {
    async upsert(args: { where: { tripId: string }; create: { tripId: string } }) {
      emailDeliveryTripIds.add(args.where.tripId || args.create.tripId);
      return { tripId: args.where.tripId || args.create.tripId };
    },
  } as unknown as BookingEmailDeliveryDelegate;

  return {
    client: { trip: delegate, bookingEmailDelivery },
    getTrip: () => trip,
    getSuccessfulUpdates: () => successfulUpdates,
    getEmailDeliveryCount: () => emailDeliveryTripIds.size,
  };
}

test("settles an unpaid trip once and confirms it", async () => {
  const store = createSettlementClient(createTrip({
    paymentStatus: PaymentStatus.UNPAID,
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: null,
  }));

  const settled = await settleTripPaid(store.client, {
    trip: store.getTrip(),
    checkoutSessionId: "cs_1",
    paymentIntentId: "pi_1",
    paidAmount: new Prisma.Decimal("100.00"),
  });

  assert.ok(settled);
  assert.equal(store.getTrip().paymentStatus, PaymentStatus.PAID);
  assert.equal(store.getTrip().status, TripStatus.CONFIRMED);
  assert.equal(store.getTrip().stripeCheckoutSessionId, "cs_1");
  assert.equal(store.getTrip().stripePaymentIntentId, "pi_1");
  assert.equal(store.getTrip().paidAmount?.toString(), "100");
  assert.equal(store.getEmailDeliveryCount(), 1);
});

test("repeated success is idempotent and does not trigger a second settlement", async () => {
  const store = createSettlementClient(createTrip({
    paymentStatus: PaymentStatus.UNPAID,
  }));
  const input = {
    trip: store.getTrip(),
    checkoutSessionId: "cs_1",
    paymentIntentId: "pi_1",
    paidAmount: new Prisma.Decimal("100.00"),
  };

  assert.ok(await settleTripPaid(store.client, input));
  const repeated = await settleTripPaid(store.client, {
    ...input,
    trip: store.getTrip(),
  });

  assert.equal(repeated, null);
  assert.equal(store.getTrip().paymentStatus, PaymentStatus.PAID);
  assert.equal(store.getEmailDeliveryCount(), 1);
});

for (const paymentStatus of [
  PaymentStatus.PARTIALLY_REFUNDED,
  PaymentStatus.REFUNDED,
]) {
  test(`late success cannot overwrite ${paymentStatus}`, async () => {
    const store = createSettlementClient(createTrip({
      paymentStatus,
      status: paymentStatus === PaymentStatus.REFUNDED
        ? TripStatus.REFUNDED
        : TripStatus.COMPLETED,
      paidAmount: new Prisma.Decimal("100.00"),
      refundedAmount: new Prisma.Decimal("25.00"),
    }));

    const result = await settleTripPaid(store.client, {
      trip: store.getTrip(),
      checkoutSessionId: "cs_1",
      paymentIntentId: "pi_1",
      paidAmount: new Prisma.Decimal("100.00"),
    });

    assert.equal(result, null);
    assert.equal(store.getTrip().paymentStatus, paymentStatus);
    assert.equal(store.getEmailDeliveryCount(), 0);
  });
}

test("a failed payment attempt does not cancel the trip", async () => {
  const store = createSettlementClient(createTrip());

  await markTripPaymentAttemptFailed(store.client, store.getTrip(), "pi_1");

  assert.equal(store.getTrip().paymentStatus, PaymentStatus.FAILED);
  assert.equal(store.getTrip().status, TripStatus.PENDING);
});

test("Checkout Session expiration fails and cancels an unpaid pending trip", async () => {
  const store = createSettlementClient(createTrip());

  await expireTripPayment(store.client, store.getTrip());

  assert.equal(store.getTrip().paymentStatus, PaymentStatus.FAILED);
  assert.equal(store.getTrip().status, TripStatus.CANCELLED);
});

test("late expiration cannot cancel a paid trip", async () => {
  const store = createSettlementClient(createTrip({
    paymentStatus: PaymentStatus.PAID,
    status: TripStatus.CONFIRMED,
  }));

  await expireTripPayment(store.client, store.getTrip());

  assert.equal(store.getTrip().paymentStatus, PaymentStatus.PAID);
  assert.equal(store.getTrip().status, TripStatus.CONFIRMED);
  assert.equal(store.getSuccessfulUpdates(), 0);
});

test("refund snapshots are cumulative and cannot decrease the recorded amount", async () => {
  const store = createSettlementClient(createTrip({
    paymentStatus: PaymentStatus.PAID,
    status: TripStatus.COMPLETED,
    paidAmount: new Prisma.Decimal("100.00"),
  }));

  assert.equal(await applyTripRefund(store.client, {
    trip: store.getTrip(),
    refundedAmount: new Prisma.Decimal("40.00"),
    fullyRefunded: false,
  }), true);
  assert.equal(await applyTripRefund(store.client, {
    trip: store.getTrip(),
    refundedAmount: new Prisma.Decimal("20.00"),
    fullyRefunded: false,
  }), false);

  assert.equal(store.getTrip().refundedAmount.toString(), "40");
  assert.equal(store.getTrip().paymentStatus, PaymentStatus.PARTIALLY_REFUNDED);
});

test("full refund is idempotent and cannot regress to a partial refund", async () => {
  const store = createSettlementClient(createTrip({
    paymentStatus: PaymentStatus.PARTIALLY_REFUNDED,
    status: TripStatus.COMPLETED,
    paidAmount: new Prisma.Decimal("100.00"),
    refundedAmount: new Prisma.Decimal("40.00"),
  }));

  assert.equal(await applyTripRefund(store.client, {
    trip: store.getTrip(),
    refundedAmount: new Prisma.Decimal("100.00"),
    fullyRefunded: true,
  }), true);
  assert.equal(store.getTrip().paymentStatus, PaymentStatus.REFUNDED);
  assert.equal(store.getTrip().status, TripStatus.REFUNDED);

  assert.equal(await applyTripRefund(store.client, {
    trip: store.getTrip(),
    refundedAmount: new Prisma.Decimal("100.00"),
    fullyRefunded: false,
  }), false);
  assert.equal(store.getTrip().paymentStatus, PaymentStatus.REFUNDED);
  assert.equal(store.getTrip().status, TripStatus.REFUNDED);
  assert.equal(store.getTrip().refundedAmount.toString(), "100");
});

test("rejects Stripe identifiers owned by another trip settlement", async () => {
  const store = createSettlementClient(createTrip());

  await assert.rejects(() => settleTripPaid(store.client, {
    trip: store.getTrip(),
    checkoutSessionId: "cs_other",
    paymentIntentId: "pi_1",
    paidAmount: new Prisma.Decimal("100.00"),
  }), /Checkout Session does not belong/);

  await assert.rejects(() => markTripPaymentAttemptFailed(
    store.client,
    store.getTrip(),
    "pi_other",
  ), /PaymentIntent does not belong/);
});

function createAbandonedTrip(overrides: Partial<Trip> = {}) {
  return createTrip({
    paymentMethod: PaymentMethod.STRIPE,
    paymentStatus: PaymentStatus.UNPAID,
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: null,
    bookingRequestId: "request-1",
    discountCodeId: "discount-1",
    ...overrides,
  });
}

test("releasing an abandoned checkout cancels the trip and frees its booking request and coupon", async () => {
  const store = createSettlementClient(createAbandonedTrip());

  assert.equal(await releaseAbandonedCheckoutTrip(store.client, "trip-1"), true);

  assert.equal(store.getTrip().status, TripStatus.CANCELLED);
  assert.equal(store.getTrip().paymentStatus, PaymentStatus.FAILED);
  assert.equal(store.getTrip().bookingRequestId, null);
  assert.equal(store.getTrip().discountCodeId, null);
  assert.equal(await releaseAbandonedCheckoutTrip(store.client, "trip-1"), false);
});

for (const [name, overrides] of [
  ["has a Checkout Session", { stripeCheckoutSessionId: "cs_1" }],
  ["is already paid", { paymentStatus: PaymentStatus.PAID, status: TripStatus.CONFIRMED }],
  ["is a cash booking", { paymentMethod: PaymentMethod.CASH, paymentStatus: PaymentStatus.PENDING }],
] as const) {
  test(`releasing an abandoned checkout leaves a trip that ${name} untouched`, async () => {
    const store = createSettlementClient(createAbandonedTrip(overrides));
    const before = store.getTrip();

    assert.equal(await releaseAbandonedCheckoutTrip(store.client, "trip-1"), false);
    assert.equal(await releaseAbandonedCheckoutTrips(store.client, {
      createdBefore: new Date("2027-01-01T00:00:00.000Z"),
      limit: 10,
    }), 0);

    assert.deepEqual(store.getTrip(), before);
    assert.equal(store.getSuccessfulUpdates(), 0);
  });
}

test("releasing an abandoned checkout respects the age cutoff", async () => {
  const store = createSettlementClient(createAbandonedTrip());
  const createdAt = store.getTrip().createdAt;

  assert.equal(await releaseAbandonedCheckoutTrip(store.client, "trip-1", {
    createdBefore: new Date(createdAt.getTime() - 1),
  }), false);
  assert.equal(store.getTrip().status, TripStatus.PENDING);

  assert.equal(await releaseAbandonedCheckoutTrip(store.client, "trip-1", {
    createdBefore: new Date(createdAt.getTime() + 1),
  }), true);
  assert.equal(store.getTrip().status, TripStatus.CANCELLED);
});

test("a Checkout Session attached before release wins the race", async () => {
  const store = createSettlementClient(createAbandonedTrip());
  await store.client.trip.updateMany({
    where: { id: "trip-1" },
    data: { stripeCheckoutSessionId: "cs_1" },
  });

  assert.equal(await releaseAbandonedCheckoutTrip(store.client, "trip-1"), false);
  assert.equal(store.getTrip().status, TripStatus.PENDING);
  assert.equal(store.getTrip().bookingRequestId, "request-1");
});

test("batch release reports how many abandoned checkouts it released", async () => {
  const store = createSettlementClient(createAbandonedTrip());
  const options = { createdBefore: new Date("2027-01-01T00:00:00.000Z"), limit: 50 };

  assert.equal(await releaseAbandonedCheckoutTrips(store.client, options), 1);
  assert.equal(store.getTrip().status, TripStatus.CANCELLED);
  assert.equal(store.getTrip().bookingRequestId, null);
  assert.equal(await releaseAbandonedCheckoutTrips(store.client, options), 0);
});
