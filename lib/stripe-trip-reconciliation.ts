import {
  PaymentMethod,
  PaymentStatus,
  Prisma,
  type Trip,
} from "@prisma/client";
import type Stripe from "stripe";

import { getStripeDeploymentId } from "./stripe";
import { expireTripPayment, settleTripPaid } from "./trip-settlement";

type ReconciliationClient = Pick<
  Prisma.TransactionClient,
  "trip" | "bookingEmailDelivery"
>;

export class StripeTripReconciliationError extends Error {}

function sessionTripId(session: Stripe.Checkout.Session): string | null {
  return session.metadata?.tripId
    || session.metadata?.orderId
    || session.client_reference_id
    || null;
}

function expectedMinor(trip: Pick<Trip, "total">): number {
  if (!trip.total) {
    throw new StripeTripReconciliationError("Trip has no expected total");
  }

  const amount = new Prisma.Decimal(trip.total).mul(100);
  if (!amount.isInteger()) {
    throw new StripeTripReconciliationError("Trip total has more than two decimal places");
  }
  return amount.toNumber();
}

export async function reconcileCheckoutSession(
  tx: ReconciliationClient,
  session: Stripe.Checkout.Session,
  expectedTripId?: string,
) {
  if (session.metadata?.deploymentId !== getStripeDeploymentId()) {
    throw new StripeTripReconciliationError(
      "Checkout Session belongs to another deployment",
    );
  }

  const referencedTripId = sessionTripId(session);
  if (!referencedTripId) {
    throw new StripeTripReconciliationError("Checkout Session does not reference a trip");
  }
  if (expectedTripId && referencedTripId !== expectedTripId) {
    throw new StripeTripReconciliationError("Trip does not match this Checkout Session");
  }

  const trip = await tx.trip.findUnique({ where: { id: referencedTripId } });
  if (!trip) {
    throw new StripeTripReconciliationError("Checkout Session references an unknown trip");
  }
  if (trip.paymentMethod !== PaymentMethod.STRIPE) {
    throw new StripeTripReconciliationError("Trip is not configured for Stripe payment");
  }
  if (trip.stripeCheckoutSessionId !== session.id) {
    throw new StripeTripReconciliationError("Checkout Session does not belong to this trip");
  }

  if (session.status === "expired") {
    await expireTripPayment(tx, trip);
    return { tripId: trip.id, outcome: "expired" as const };
  }

  if (session.payment_status !== "paid") {
    return { tripId: trip.id, outcome: "pending" as const };
  }
  if (typeof session.amount_total !== "number" || !session.currency) {
    throw new StripeTripReconciliationError("Paid Checkout Session is missing amount or currency");
  }
  if (session.amount_total !== expectedMinor(trip)) {
    throw new StripeTripReconciliationError("Stripe payment amount does not match trip total");
  }
  if (session.currency.toUpperCase() !== trip.currency.toUpperCase()) {
    throw new StripeTripReconciliationError("Stripe payment currency does not match trip currency");
  }

  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id;
  if (!paymentIntentId) {
    throw new StripeTripReconciliationError("Paid Checkout Session has no PaymentIntent");
  }

  const settledTrip = await settleTripPaid(tx, {
    trip,
    checkoutSessionId: session.id,
    paymentIntentId,
    paidAmount: new Prisma.Decimal(session.amount_total).div(100),
  });

  return {
    tripId: trip.id,
    outcome: settledTrip ? "settled" as const : "already-settled" as const,
  };
}

export const RECONCILABLE_PAYMENT_STATUSES = [
  PaymentStatus.UNPAID,
  PaymentStatus.PENDING,
  PaymentStatus.FAILED,
] as const;
