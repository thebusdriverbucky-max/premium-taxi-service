import { Prisma, type Trip } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { deliverBookingEmail } from "@/lib/booking-email-outbox";
import { db } from "@/lib/db";
import { getStripe, getStripeDeploymentId } from "@/lib/stripe";
import { constructStripeWebhookEvent } from "@/lib/stripe-webhook-signature";
import {
  applyTripRefund,
  expireTripPayment,
  markTripPaymentAttemptFailed,
  settleTripPaid,
} from "@/lib/trip-settlement";

export const dynamic = "force-dynamic";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

class WebhookDataError extends Error {}
class DuplicateWebhookEventError extends Error {}

async function eventDeploymentId(event: Stripe.Event): Promise<string | null> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed":
      return (event.data.object as Stripe.Checkout.Session).metadata?.deploymentId || null;
    case "payment_intent.succeeded":
    case "payment_intent.payment_failed":
      return (event.data.object as Stripe.PaymentIntent).metadata.deploymentId || null;
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      if (charge.metadata.deploymentId) return charge.metadata.deploymentId;
      if (charge.payment_intent && typeof charge.payment_intent !== "string") {
        return charge.payment_intent.metadata.deploymentId || null;
      }
      if (typeof charge.payment_intent === "string") {
        const paymentIntent = await getStripe().paymentIntents.retrieve(charge.payment_intent);
        return paymentIntent.metadata.deploymentId || null;
      }
      return null;
    }
    default:
      return null;
  }
}

async function recordWebhookEvent(
  tx: Prisma.TransactionClient,
  event: Stripe.Event,
) {
  try {
    await tx.stripeWebhookEvent.create({ data: { id: event.id, type: event.type } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new DuplicateWebhookEventError();
    }
    throw error;
  }
}

function minorToDecimal(minor: number): Prisma.Decimal {
  if (!Number.isSafeInteger(minor) || minor < 0) {
    throw new WebhookDataError("Stripe supplied an invalid monetary amount");
  }

  return new Prisma.Decimal(minor).div(100);
}

function expectedMinor(trip: Pick<Trip, "total">): number {
  if (!trip.total) throw new WebhookDataError("Trip has no expected total");

  const minor = new Prisma.Decimal(trip.total).mul(100);
  if (!minor.isInteger()) {
    throw new WebhookDataError("Trip total has more than two decimal places");
  }

  return minor.toNumber();
}

function assertPaymentMatchesTrip(
  trip: Pick<Trip, "total" | "currency">,
  amount: number,
  currency: string,
) {
  if (amount !== expectedMinor(trip)) {
    throw new WebhookDataError("Stripe payment amount does not match trip total");
  }
  if (currency.toUpperCase() !== trip.currency.toUpperCase()) {
    throw new WebhookDataError("Stripe payment currency does not match trip currency");
  }
}

function sessionTripId(session: Stripe.Checkout.Session): string | null {
  return session.metadata?.tripId
    || session.metadata?.orderId
    || session.client_reference_id
    || null;
}

async function findTripForSession(
  tx: Prisma.TransactionClient,
  session: Stripe.Checkout.Session,
) {
  const tripId = sessionTripId(session);
  const trip = tripId
    ? await tx.trip.findUnique({ where: { id: tripId }, include: { tariffPlan: true } })
    : await tx.trip.findUnique({
        where: { stripeCheckoutSessionId: session.id },
        include: { tariffPlan: true },
      });

  if (!trip) throw new WebhookDataError("Checkout Session does not reference a trip");
  if (trip.stripeCheckoutSessionId && trip.stripeCheckoutSessionId !== session.id) {
    throw new WebhookDataError("Checkout Session does not belong to this trip");
  }
  return trip;
}

async function findTripForPaymentIntent(
  tx: Prisma.TransactionClient,
  paymentIntent: Stripe.PaymentIntent,
) {
  const tripId = paymentIntent.metadata.tripId || paymentIntent.metadata.orderId;
  const trip = tripId
    ? await tx.trip.findUnique({ where: { id: tripId }, include: { tariffPlan: true } })
    : await tx.trip.findUnique({
        where: { stripePaymentIntentId: paymentIntent.id },
        include: { tariffPlan: true },
      });

  if (!trip) throw new WebhookDataError("PaymentIntent does not reference a trip");
  if (trip.stripePaymentIntentId && trip.stripePaymentIntentId !== paymentIntent.id) {
    throw new WebhookDataError("PaymentIntent does not belong to this trip");
  }
  return trip;
}

async function markSessionPaid(
  tx: Prisma.TransactionClient,
  session: Stripe.Checkout.Session,
) {
  if (session.payment_status !== "paid") return null;
  if (typeof session.amount_total !== "number" || !session.currency) {
    throw new WebhookDataError("Paid Checkout Session is missing amount or currency");
  }

  const trip = await findTripForSession(tx, session);
  assertPaymentMatchesTrip(trip, session.amount_total, session.currency);

  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id;
  if (!paymentIntentId) {
    throw new WebhookDataError("Paid Checkout Session has no PaymentIntent");
  }

  return settleTripPaid(tx, {
    trip,
    checkoutSessionId: session.id,
    paymentIntentId,
    paidAmount: minorToDecimal(session.amount_total),
  });
}

async function markPaymentIntentPaid(
  tx: Prisma.TransactionClient,
  paymentIntent: Stripe.PaymentIntent,
) {
  if (paymentIntent.status !== "succeeded") return null;

  const trip = await findTripForPaymentIntent(tx, paymentIntent);
  assertPaymentMatchesTrip(trip, paymentIntent.amount_received, paymentIntent.currency);

  return settleTripPaid(tx, {
    trip,
    paymentIntentId: paymentIntent.id,
    paidAmount: minorToDecimal(paymentIntent.amount_received),
  });
}

async function markPaymentFailed(
  tx: Prisma.TransactionClient,
  paymentIntent: Stripe.PaymentIntent,
) {
  const trip = await findTripForPaymentIntent(tx, paymentIntent);
  if (trip.paymentStatus === "PAID" || trip.paymentStatus === "REFUNDED") return;

  await markTripPaymentAttemptFailed(tx, trip, paymentIntent.id);
}

async function markSessionExpired(
  tx: Prisma.TransactionClient,
  session: Stripe.Checkout.Session,
) {
  const trip = await findTripForSession(tx, session);
  if (trip.paymentStatus === "PAID" || trip.paymentStatus === "REFUNDED") return;

  await expireTripPayment(tx, trip);
}

async function applyRefund(tx: Prisma.TransactionClient, charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id;
  if (!paymentIntentId) throw new WebhookDataError("Refunded charge has no PaymentIntent");

  const trip = await tx.trip.findUnique({ where: { stripePaymentIntentId: paymentIntentId } });
  if (!trip) throw new WebhookDataError("Refunded charge does not reference a trip");
  if (charge.currency.toUpperCase() !== trip.currency.toUpperCase()) {
    throw new WebhookDataError("Refund currency does not match trip currency");
  }

  const paidMinor = trip.paidAmount
    ? new Prisma.Decimal(trip.paidAmount).mul(100).toNumber()
    : expectedMinor(trip);
  if (charge.amount_refunded < 0 || charge.amount_refunded > paidMinor) {
    throw new WebhookDataError("Refund amount is outside the paid amount");
  }

  const fullyRefunded = charge.amount_refunded === paidMinor;
  await applyTripRefund(tx, {
    trip,
    refundedAmount: minorToDecimal(charge.amount_refunded),
    fullyRefunded,
  });
}

async function processEvent(event: Stripe.Event) {
  return db.$transaction(async (tx) => {
    await recordWebhookEvent(tx, event);

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        return markSessionPaid(tx, event.data.object as Stripe.Checkout.Session);
      case "payment_intent.succeeded":
        return markPaymentIntentPaid(tx, event.data.object as Stripe.PaymentIntent);
      case "payment_intent.payment_failed":
        await markPaymentFailed(tx, event.data.object as Stripe.PaymentIntent);
        return null;
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        await markSessionExpired(tx, event.data.object as Stripe.Checkout.Session);
        return null;
      case "charge.refunded":
        await applyRefund(tx, event.data.object as Stripe.Charge);
        return null;
      default:
        return null;
    }
  });
}

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = constructStripeWebhookEvent(
      getStripe(),
      await request.text(),
      request.headers.get("stripe-signature") || "",
      webhookSecret,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (await eventDeploymentId(event) !== getStripeDeploymentId()) {
      return NextResponse.json({ received: true, ignored: true });
    }
  } catch (error) {
    console.error("Stripe webhook deployment validation failed", {
      eventId: event.id,
      eventType: event.type,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Webhook validation failed" }, { status: 500 });
  }

  try {
    const trip = await processEvent(event);
    if (trip) await deliverBookingEmail(trip.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof DuplicateWebhookEventError) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("Stripe webhook processing failed", {
      eventId: event.id,
      eventType: event.type,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
