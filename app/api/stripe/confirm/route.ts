import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const tripId = searchParams.get("tripId");

  if (!sessionId || !tripId) {
    return NextResponse.json({ error: "Missing session_id or tripId" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Security: only allow confirming the trip that actually belongs
    // to this Checkout Session (otherwise any paid session_id could
    // mark an arbitrary trip as paid).
    const metaTripId = session.metadata?.tripId || session.metadata?.orderId;
    if (metaTripId !== tripId) {
      return NextResponse.json(
        { error: "Trip does not match this checkout session" },
        { status: 403 }
      );
    }

    if (session.payment_status === "paid") {
      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : null;

      const trip = await db.trip.findUnique({ where: { id: tripId } });
      if (!trip || trip.stripeCheckoutSessionId !== session.id) {
        return NextResponse.json({ error: "Checkout session does not belong to this trip" }, { status: 403 });
      }

      const expectedAmount = trip.total
        ? new Prisma.Decimal(trip.total).mul(100).toNumber()
        : null;
      if (
        expectedAmount === null
        || session.amount_total !== expectedAmount
        || session.currency?.toUpperCase() !== trip.currency.toUpperCase()
      ) {
        return NextResponse.json({ error: "Payment amount or currency mismatch" }, { status: 409 });
      }

      await db.trip.update({
        where: { id: tripId },
        data: {
          paymentStatus: "PAID",
          status: trip.status === "PENDING" ? "CONFIRMED" : trip.status,
          paidAmount: new Prisma.Decimal(session.amount_total).div(100),
          paidAt: trip.paidAt || new Date(),
          // Store the real PaymentIntent id so charge.refunded webhooks
          // can find this trip later.
          ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
        },
      });

      // Fallback for a delayed/missed webhook: confirm the trip so it
      // does not stay PENDING. Confirmation emails are sent by the webhook.
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, status: session.payment_status });
  } catch (error: any) {
    console.error("Stripe confirmation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
