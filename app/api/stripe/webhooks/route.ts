import { Prisma, type Trip } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { db } from "@/lib/db";
import { sendBookingEmails } from "@/lib/email";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

class WebhookDataError extends Error {}

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

  return tx.trip.update({
    where: { id: trip.id },
    data: {
      status: trip.status === "PENDING" ? "CONFIRMED" : trip.status,
      paymentStatus: "PAID",
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      paidAmount: minorToDecimal(session.amount_total),
      paidAt: trip.paidAt || new Date(),
    },
    include: { tariffPlan: true },
  });
}

async function markPaymentIntentPaid(
  tx: Prisma.TransactionClient,
  paymentIntent: Stripe.PaymentIntent,
) {
  if (paymentIntent.status !== "succeeded") return null;

  const trip = await findTripForPaymentIntent(tx, paymentIntent);
  assertPaymentMatchesTrip(trip, paymentIntent.amount_received, paymentIntent.currency);

  return tx.trip.update({
    where: { id: trip.id },
    data: {
      status: trip.status === "PENDING" ? "CONFIRMED" : trip.status,
      paymentStatus: "PAID",
      stripePaymentIntentId: paymentIntent.id,
      paidAmount: minorToDecimal(paymentIntent.amount_received),
      paidAt: trip.paidAt || new Date(),
    },
    include: { tariffPlan: true },
  });
}

async function markPaymentFailed(
  tx: Prisma.TransactionClient,
  paymentIntent: Stripe.PaymentIntent,
) {
  const trip = await findTripForPaymentIntent(tx, paymentIntent);
  if (trip.paymentStatus === "PAID" || trip.paymentStatus === "REFUNDED") return;

  await tx.trip.update({
    where: { id: trip.id },
    data: {
      paymentStatus: "FAILED",
      status: trip.status === "PENDING" ? "CANCELLED" : trip.status,
      stripePaymentIntentId: paymentIntent.id,
    },
  });
}

async function markSessionExpired(
  tx: Prisma.TransactionClient,
  session: Stripe.Checkout.Session,
) {
  const trip = await findTripForSession(tx, session);
  if (trip.paymentStatus === "PAID" || trip.paymentStatus === "REFUNDED") return;

  await tx.trip.update({
    where: { id: trip.id },
    data: {
      paymentStatus: "FAILED",
      status: trip.status === "PENDING" ? "CANCELLED" : trip.status,
    },
  });
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
  await tx.trip.update({
    where: { id: trip.id },
    data: {
      refundedAmount: minorToDecimal(charge.amount_refunded),
      refundedAt: charge.amount_refunded > 0 ? new Date() : null,
      paymentStatus: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED",
      status: fullyRefunded ? "REFUNDED" : trip.status,
    },
  });
}

async function processEvent(event: Stripe.Event) {
  return db.$transaction(async (tx) => {
    await tx.stripeWebhookEvent.create({ data: { id: event.id, type: event.type } });

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

async function sendConfirmationEmails(trip: Awaited<ReturnType<typeof markSessionPaid>>) {
  if (!trip) return;
  const settings = await db.storeSettings.findFirst({
    select: { storeEmail: true, companyName: true },
  });

  await sendBookingEmails({
    id: trip.id,
    tripNumber: trip.tripNumber || undefined,
    customerName: trip.passengerName || "Customer",
    customerEmail: trip.passengerEmail || "",
    customerPhone: trip.passengerPhone || "",
    pickupLocation: trip.pickupAddress,
    dropoffLocation: trip.dropoffAddress,
    pickupDate: trip.pickupDateTime || new Date(),
    pickupTime: trip.pickupDateTime
      ? new Date(trip.pickupDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "",
    passengers: trip.passengerCount || 1,
    tariffName: trip.tariffPlan?.name || "Standard",
    price: Number(trip.total),
    currency: trip.currency,
    paymentMethod: "STRIPE",
    paymentStatus: "PAID",
    flightNumber: trip.flightNumber || undefined,
    notes: trip.notes || undefined,
  }, settings?.storeEmail || process.env.ADMIN_EMAIL || "admin@example.com", settings?.companyName || "Taxi Service");
}

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      request.headers.get("stripe-signature") || "",
      webhookSecret,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const trip = await processEvent(event);
    await sendConfirmationEmails(trip);
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
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
