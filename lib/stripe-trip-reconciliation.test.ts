import assert from "node:assert/strict";
import test from "node:test";

import {
  PaymentMethod,
  PaymentStatus,
  Prisma,
  TripStatus,
  type Trip,
} from "@prisma/client";
import type Stripe from "stripe";

import {
  reconcileCheckoutSession,
  StripeTripReconciliationError,
} from "./stripe-trip-reconciliation";

process.env.STRIPE_DEPLOYMENT_ID = "taxi-test";

function createTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-1",
    total: new Prisma.Decimal("42.50"),
    currency: "EUR",
    status: TripStatus.PENDING,
    paymentMethod: PaymentMethod.STRIPE,
    paymentStatus: PaymentStatus.PENDING,
    stripeCheckoutSessionId: "cs_1",
    stripePaymentIntentId: null,
    paidAmount: null,
    paidAt: null,
    refundedAmount: new Prisma.Decimal(0),
    refundedAt: null,
    ...overrides,
  } as Trip;
}

function createSession(
  overrides: Partial<Stripe.Checkout.Session> = {},
): Stripe.Checkout.Session {
  return {
    id: "cs_1",
    object: "checkout.session",
    status: "complete",
    payment_status: "paid",
    amount_total: 4_250,
    currency: "eur",
    payment_intent: "pi_1",
    client_reference_id: "trip-1",
    metadata: { tripId: "trip-1", deploymentId: "taxi-test" },
    ...overrides,
  } as Stripe.Checkout.Session;
}

function matches(value: unknown, filter: unknown): boolean {
  if (filter === undefined) return true;
  if (typeof filter !== "object" || filter === null) return value === filter;

  const condition = filter as {
    in?: unknown[];
    notIn?: unknown[];
    not?: unknown;
  };
  if (condition.in && !condition.in.includes(value)) return false;
  if (condition.notIn && condition.notIn.includes(value)) return false;
  if (condition.not !== undefined && value === condition.not) return false;
  return true;
}

function createClient(initialTrip: Trip) {
  let trip = { ...initialTrip };
  const emailDeliveryTripIds = new Set<string>();

  const tripDelegate = {
    async findUnique(args: { where: { id: string } }) {
      return args.where.id === trip.id ? { ...trip } : null;
    },
    async updateMany(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) {
      const matched = Object.entries(args.where).every(([key, filter]) =>
        matches(trip[key as keyof Trip], filter));
      if (!matched) return { count: 0 };

      trip = { ...trip, ...args.data } as Trip;
      return { count: 1 };
    },
  } as unknown as Prisma.TransactionClient["trip"];

  const bookingEmailDelivery = {
    async upsert(args: { where: { tripId: string }; create: { tripId: string } }) {
      emailDeliveryTripIds.add(args.where.tripId || args.create.tripId);
      return { tripId: args.where.tripId || args.create.tripId };
    },
  } as unknown as Prisma.TransactionClient["bookingEmailDelivery"];

  return {
    client: { trip: tripDelegate, bookingEmailDelivery },
    getTrip: () => trip,
    getEmailDeliveryCount: () => emailDeliveryTripIds.size,
  };
}

test("reconciles a paid Checkout Session without a browser return", async () => {
  const store = createClient(createTrip());

  const result = await reconcileCheckoutSession(
    store.client,
    createSession(),
    "trip-1",
  );

  assert.equal(result.outcome, "settled");
  assert.equal(store.getTrip().paymentStatus, PaymentStatus.PAID);
  assert.equal(store.getTrip().status, TripStatus.CONFIRMED);
  assert.equal(store.getTrip().stripePaymentIntentId, "pi_1");
  assert.equal(store.getEmailDeliveryCount(), 1);
});

test("leaves an open unpaid Checkout Session pending", async () => {
  const store = createClient(createTrip());

  const result = await reconcileCheckoutSession(store.client, createSession({
    status: "open",
    payment_status: "unpaid",
    payment_intent: null,
  }));

  assert.equal(result.outcome, "pending");
  assert.equal(store.getTrip().paymentStatus, PaymentStatus.PENDING);
  assert.equal(store.getTrip().status, TripStatus.PENDING);
  assert.equal(store.getEmailDeliveryCount(), 0);
});

test("expires an unpaid Checkout Session and cancels its pending trip", async () => {
  const store = createClient(createTrip());

  const result = await reconcileCheckoutSession(store.client, createSession({
    status: "expired",
    payment_status: "unpaid",
    payment_intent: null,
  }));

  assert.equal(result.outcome, "expired");
  assert.equal(store.getTrip().paymentStatus, PaymentStatus.FAILED);
  assert.equal(store.getTrip().status, TripStatus.CANCELLED);
  assert.equal(store.getEmailDeliveryCount(), 0);
});

test("rejects Checkout Sessions that reference another trip", async () => {
  const store = createClient(createTrip());

  await assert.rejects(
    () => reconcileCheckoutSession(store.client, createSession({
      client_reference_id: "trip-other",
      metadata: { tripId: "trip-other", deploymentId: "taxi-test" },
    }), "trip-1"),
    StripeTripReconciliationError,
  );
});

test("rejects Checkout Sessions created by another deployment", async () => {
  const store = createClient(createTrip());

  await assert.rejects(
    () => reconcileCheckoutSession(store.client, createSession({
      metadata: { tripId: "trip-1", deploymentId: "another-site" },
    })),
    /another deployment/,
  );
  assert.equal(store.getTrip().paymentStatus, PaymentStatus.PENDING);
  assert.equal(store.getEmailDeliveryCount(), 0);
});

test("rejects paid Checkout Sessions with a mismatched amount or currency", async () => {
  const store = createClient(createTrip());

  await assert.rejects(
    () => reconcileCheckoutSession(store.client, createSession({ amount_total: 4_249 })),
    /amount does not match/,
  );
  await assert.rejects(
    () => reconcileCheckoutSession(store.client, createSession({ currency: "usd" })),
    /currency does not match/,
  );
});
