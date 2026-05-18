import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const tripId = searchParams.get("tripId");

  if (!sessionId || !tripId) {
    return NextResponse.json({ error: "Missing session_id or tripId" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      await db.trip.update({
        where: { id: tripId },
        data: { paymentStatus: "paid" },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, status: session.payment_status });
  } catch (error: any) {
    console.error("Stripe confirmation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
