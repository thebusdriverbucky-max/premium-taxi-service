import { deliverBookingEmail } from "@/lib/booking-email-outbox";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import {
  reconcileCheckoutSession,
  StripeTripReconciliationError,
} from "@/lib/stripe-trip-reconciliation";
import { z } from "zod";

const confirmationSchema = z.object({
  sessionId: z.string().trim().min(1).max(255),
  tripId: z.string().trim().min(1).max(255),
}).strict();

export async function POST(request: NextRequest) {
  const parsed = confirmationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid confirmation request" }, { status: 400 });
  }

  const { sessionId, tripId } = parsed.data;

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const result = await db.$transaction((tx) =>
      reconcileCheckoutSession(tx, session, tripId));

    if (result.outcome === "settled" || result.outcome === "already-settled") {
      await deliverBookingEmail(result.tripId);
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof StripeTripReconciliationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Stripe confirmation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payment confirmation failed" },
      { status: 500 },
    );
  }
}
