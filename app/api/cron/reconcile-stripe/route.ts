import { NextRequest, NextResponse } from "next/server";

import { deliverPendingBookingEmails } from "@/lib/booking-email-outbox";
import { db } from "@/lib/db";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import {
  reconcileCheckoutSession,
  RECONCILABLE_PAYMENT_STATUSES,
} from "@/lib/stripe-trip-reconciliation";
import {
  ABANDONED_CHECKOUT_TRIP_MS,
  releaseAbandonedCheckoutTrips,
} from "@/lib/trip-settlement";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 50;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json({ error: "Payment reconciliation is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const candidates = await db.trip.findMany({
    where: {
      paymentMethod: "STRIPE",
      paymentStatus: { in: [...RECONCILABLE_PAYMENT_STATUSES] },
      stripeCheckoutSessionId: { not: null },
    },
    select: { id: true, stripeCheckoutSessionId: true },
    orderBy: { updatedAt: "asc" },
    take: BATCH_SIZE,
  });

  const summary = {
    checked: candidates.length,
    settled: 0,
    expired: 0,
    pending: 0,
    alreadySettled: 0,
    failed: 0,
  };

  for (const candidate of candidates) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(
        candidate.stripeCheckoutSessionId!,
      );
      const result = await db.$transaction((tx) =>
        reconcileCheckoutSession(tx, session, candidate.id));

      if (result.outcome === "already-settled") summary.alreadySettled += 1;
      else summary[result.outcome] += 1;
    } catch (error) {
      summary.failed += 1;
      console.error("Stripe trip reconciliation failed", {
        tripId: candidate.id,
        checkoutSessionId: candidate.stripeCheckoutSessionId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  let releasedAbandoned = 0;
  try {
    releasedAbandoned = await releaseAbandonedCheckoutTrips(db, {
      createdBefore: new Date(Date.now() - ABANDONED_CHECKOUT_TRIP_MS),
      limit: BATCH_SIZE,
    });
  } catch (error) {
    summary.failed += 1;
    console.error("Releasing abandoned checkout trips failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  const emails = await deliverPendingBookingEmails(BATCH_SIZE);

  return NextResponse.json(
    { payments: { ...summary, releasedAbandoned }, emails },
    { status: summary.failed > 0 || emails.failed > 0 ? 207 : 200 },
  );
}
