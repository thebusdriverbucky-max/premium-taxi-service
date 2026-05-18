// File: app/api/stripe/webhooks/route.ts

import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sendBookingEmails } from "@/lib/email";

export const dynamic = 'force-dynamic';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

async function handleTripCancellation(tripId: string) {
  if (!tripId) return;

  const trip = await db.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip || trip.status === "CANCELLED") return;

  await db.trip.update({
    where: { id: tripId },
    data: { status: "CANCELLED" },
  });
}

async function confirmTrip(tripId: string, paymentIntentId: string) {
  if (!tripId) return;

  const trip = await db.trip.findUnique({
    where: { id: tripId },
    include: { tariffPlan: true },
  });

  if (!trip || trip.status === "CONFIRMED") return;

  await db.trip.update({
    where: { id: tripId },
    data: {
      status: "CONFIRMED",
      paymentStatus: "paid",
      stripePaymentIntentId: paymentIntentId,
    },
  });

  // Send confirmation emails
  try {
    const storeSettings = await db.storeSettings.findFirst();
    const adminEmail = storeSettings?.storeEmail || process.env.ADMIN_EMAIL || "admin@example.com";
    const companyName = storeSettings?.companyName || "Taxi Service";

    await sendBookingEmails({
      id: trip.id,
      tripNumber: trip.tripNumber || undefined,
      customerName: trip.passengerName || "Клиент",
      customerEmail: trip.passengerEmail || "",
      customerPhone: trip.passengerPhone || "",
      pickupLocation: trip.pickupAddress,
      dropoffLocation: trip.dropoffAddress,
      pickupDate: trip.pickupDateTime || new Date(),
      pickupTime: trip.pickupDateTime ? new Date(trip.pickupDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
      passengers: trip.passengerCount || 1,
      tariffName: trip.tariffPlan?.name || "Стандарт",
      price: Number(trip.total),
      currency: trip.currency || undefined,
      paymentMethod: "CARD",
      paymentStatus: "PAID",
      flightNumber: trip.flightNumber || undefined,
      notes: trip.notes || undefined,
    }, adminEmail, companyName);
    console.log("📧 Confirmation emails sent successfully via webhook");
  } catch (emailError) {
    console.error("❌ Failed to send confirmation emails:", emailError);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const tripId = paymentIntent.metadata.orderId || paymentIntent.metadata.tripId;
  if (tripId) {
    await handleTripCancellation(tripId);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature") || "";

  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const tripId = session.metadata?.orderId || session.metadata?.tripId;
        const paymentIntentId = session.payment_intent as string;
        const sessionId = session.id;

        if (tripId) {
          await confirmTrip(tripId, paymentIntentId || sessionId);
        } else {
          const trip = await db.trip.findFirst({
            where: {
              OR: [
                sessionId ? { stripePaymentIntentId: sessionId } : null,
                paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : null
              ].filter((item): item is { stripePaymentIntentId: string } => item !== null)
            }
          });

          if (trip) {
            await confirmTrip(trip.id, paymentIntentId || sessionId);
          }
        }
        break;
      }
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const tripId = paymentIntent.metadata.orderId || paymentIntent.metadata.tripId;

        if (tripId) {
          await confirmTrip(tripId, paymentIntent.id);
        } else {
          const trip = await db.trip.findFirst({
            where: { stripePaymentIntentId: paymentIntent.id }
          });
          if (trip) {
            await confirmTrip(trip.id, paymentIntent.id);
          }
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(paymentIntent);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const tripId = session.metadata?.orderId || session.metadata?.tripId;
        if (tripId) {
          await handleTripCancellation(tripId);
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        if (charge.payment_intent) {
          const trip = await db.trip.findFirst({
            where: { stripePaymentIntentId: charge.payment_intent as string },
          });

          if (trip) {
            await db.trip.update({
              where: { id: trip.id },
              data: { status: "REFUNDED" },
            });
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
