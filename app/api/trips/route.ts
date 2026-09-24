import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import { createBookingSchema } from "@/lib/validations";
import { generateOrderNumber } from "@/lib/order-number";
import { z } from "zod";
import { sendBookingEmails } from "@/lib/email";
import type { Prisma } from "@prisma/client";
import { computeDrivingRoute, RouteCalculationError } from "@/lib/google-routes";
import {
  calculatePrice,
  decimalToMinor,
  minorToDecimal,
  PricingError,
  type PricingDiscount,
  type PricingZone,
} from "@/lib/pricing";

function parseZones(value: unknown): PricingZone[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((zone, index) => {
    if (!zone || typeof zone !== "object") return [];
    const candidate = zone as Record<string, unknown>;
    const minKm = Number(candidate.minKm);
    const maxKm = Number(candidate.maxKm);
    const minimum = candidate.minPrice;

    if (!Number.isFinite(minKm) || !Number.isFinite(maxKm) || minimum === undefined) {
      throw new PricingError(`Tariff zone ${index} is invalid`);
    }

    return [{
      name: String(candidate.name || `Zone ${index + 1}`),
      minDistanceMeters: Math.round(minKm * 1_000),
      maxDistanceMeters: Math.round(maxKm * 1_000),
      minimumMinor: decimalToMinor(String(minimum), `zones[${index}].minPrice`),
    }];
  });
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rateLimit = await checkRateLimit(ip, "trips");
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many booking attempts. Please try again later." },
        { status: 429 }
      );
    }

    const session = await auth();
    const userId = session?.user?.id;

    const body = await request.json();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
    if (!baseUrl) {
      return NextResponse.json({ error: "Application URL is not configured" }, { status: 503 });
    }

    // Zod Validation
    let validatedData;
    try {
      validatedData = createBookingSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("❌ Validation failed:", error.issues);
        return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
      }
      throw error;
    }

    const { tariffPlanId, pickup, dropoff, passenger, extras, paymentMethod } = validatedData;
    const existingTrip = await db.trip.findUnique({
      where: { bookingRequestId: validatedData.bookingRequestId },
      select: { id: true, stripeCheckoutSessionId: true, paymentMethod: true },
    });
    if (existingTrip) {
      if (existingTrip.paymentMethod === "CASH") {
        return NextResponse.json({ success: true, tripId: existingTrip.id, url: `${baseUrl}/trips/${existingTrip.id}?success=true` });
      }
      if (existingTrip.stripeCheckoutSessionId) {
        const existingSession = await stripe.checkout.sessions.retrieve(existingTrip.stripeCheckoutSessionId);
        return NextResponse.json({ tripId: existingTrip.id, url: existingSession.url });
      }
      return NextResponse.json({ error: "Booking is already being processed" }, { status: 409 });
    }
    const tariffPlan = await db.tariffPlan.findUnique({
      where: { id: tariffPlanId, isActive: true },
    });

    if (!tariffPlan) {
      console.error("❌ Tariff plan not found:", tariffPlanId);
      return NextResponse.json({ error: "Tariff plan not found" }, { status: 400 });
    }
    const currency = tariffPlan.currency || "EUR";
    const [storeSettings, route] = await Promise.all([
      db.storeSettings.findFirst({
        select: {
          airportSurcharge: true,
          luggageFee: true,
          childSeatFee: true,
          storeEmail: true,
          companyName: true,
          enableCardPayment: true,
          enableCashPayment: true,
        },
      }),
      computeDrivingRoute(pickup, dropoff),
    ]);

    if (
      (paymentMethod === "STRIPE" && storeSettings?.enableCardPayment === false)
      || (paymentMethod === "CASH" && storeSettings?.enableCashPayment === false)
    ) {
      return NextResponse.json({ error: "Selected payment method is not available" }, { status: 400 });
    }

    let discount: PricingDiscount | undefined;
    let discountCodeId: string | null = null;

    // Validate Coupon if provided
    if (validatedData.couponCode) {
      const coupon = await db.discountCode.findUnique({
        where: { code: validatedData.couponCode },
      });

      if (!coupon || !coupon.isActive || (coupon.expiresAt && new Date() >= coupon.expiresAt)) {
        return NextResponse.json({ error: "Coupon is invalid or expired" }, { status: 400 });
      }

      discountCodeId = coupon.id;
      discount = coupon.type === "FIXED"
        ? { type: "FIXED", amountMinor: decimalToMinor(String(coupon.value), "coupon.value") }
        : { type: "PERCENT", basisPoints: Math.round(coupon.value * 100) };
    }

    const luggageQuantity = extras.luggage?.quantity ?? 0;
    const childSeatQuantity = extras.childSeats?.quantity ?? 0;
    const pricing = calculatePrice({
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      baseFareMinor: decimalToMinor(String(tariffPlan.basePrice), "basePrice"),
      pricePerKmMinor: decimalToMinor(String(tariffPlan.pricePerKm), "pricePerKm"),
      pricePerMinuteMinor: decimalToMinor(String(tariffPlan.pricePerMin), "pricePerMin"),
      minimumFareMinor: decimalToMinor(String(tariffPlan.minPrice), "minPrice"),
      zones: parseZones(tariffPlan.zones),
      includesAirport: /airport/i.test(`${pickup.address} ${dropoff.address}`),
      airportSurchargeMinor: decimalToMinor(String(storeSettings?.airportSurcharge ?? 5), "airportSurcharge"),
      luggageFeeMinor: decimalToMinor(String(storeSettings?.luggageFee ?? 5), "luggageFee"),
      luggageQuantity,
      childSeatFeeMinor: decimalToMinor(String(storeSettings?.childSeatFee ?? 5), "childSeatFee"),
      childSeatQuantity,
      discount,
    });

    const total = minorToDecimal(pricing.totalMinor);
    const computedBasePrice = minorToDecimal(pricing.subtotalMinor);
    const discountAmount = minorToDecimal(pricing.discountMinor);

    // Generate trip number
    let tripNumber;
    try {
      tripNumber = await generateOrderNumber(); // We can reuse this or create a new one
      console.log("🔢 Generated trip number:", tripNumber);
    } catch (err) {
      tripNumber = `TRP-${Math.random().toString(36).slice(2, 11).toUpperCase()}`;
      console.warn("⚠️ Failed to generate trip number, using fallback:", tripNumber);
    }

    // Create trip
    console.log("💾 Creating trip in database...");
    const trip = await db.trip.create({
      data: {
        tripNumber,
        bookingRequestId: validatedData.bookingRequestId,
        userId,
        passengerName: passenger.name,
        passengerEmail: passenger.email,
        passengerPhone: passenger.phone,
        pickupAddress: pickup.address,
        dropoffAddress: dropoff.address,
        pickupPlaceId: pickup.placeId,
        dropoffPlaceId: dropoff.placeId,
        pickupLat: pickup.latitude,
        pickupLng: pickup.longitude,
        dropoffLat: dropoff.latitude,
        dropoffLng: dropoff.longitude,
        distance: route.distanceMeters / 1_000,
        duration: Math.ceil(route.durationSeconds / 60),
        pickupDateTime: new Date(validatedData.pickupDateTime),
        scheduledAt: new Date(validatedData.pickupDateTime),
        passengerCount: passenger.count,
        flightNumber: validatedData.flightNumber,
        notes: validatedData.notes,
        extras,
        tariffPlanId,
        basePrice: computedBasePrice, // Original price before discount
        discountAmount,
        discountCodeId,
        total,
        currency,
        pricingBreakdown: { ...pricing } as Prisma.InputJsonObject,
        status: "PENDING",
        paymentMethod,
        paymentStatus: paymentMethod === "CASH" ? "PENDING" : "UNPAID",
      },
      include: {
        tariffPlan: true,
      },
    });
    console.log("✅ Trip created:", trip.id);

    // NOTE: usage of DiscountCode is tracked via the trips relation
    // (discountCodeId on Trip). The legacy Coupon model is not used here.

    // Send emails only if payment is CASH. For CARD, emails are sent via Stripe webhook after successful payment
    if (paymentMethod === "CASH") {
      try {
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
          paymentMethod: paymentMethod,
          paymentStatus: trip.paymentStatus === "PAID" ? "PAID" : "PENDING",
          flightNumber: trip.flightNumber || undefined,
          notes: trip.notes || undefined,
        }, adminEmail, companyName);
        console.log("📧 Booking emails sent successfully");
      } catch (emailError) {
        console.error("❌ Failed to send booking emails:", emailError);
      }
    }

    // If payment method is CASH, return success immediately
    if (paymentMethod === "CASH") {
      console.log("💵 Payment method is CASH, skipping Stripe");
      return NextResponse.json({
        success: true,
        tripId: trip.id,
        url: `${baseUrl}/trips/${trip.id}?success=true`
      });
    }

    // Create Stripe Session
    console.log("💳 Creating Stripe session...");
    try {
      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: `Taxi Trip: ${tariffPlan.name}`,
                description: `${pickup.address} to ${dropoff.address}`,
              },
              unit_amount: pricing.totalMinor,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        client_reference_id: trip.id,
        success_url: `${baseUrl}/trips/${trip.id}?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/booking?canceled=true`,
        metadata: {
          tripId: trip.id,
          orderId: trip.id, // Keep for backward compatibility with webhook
        },
        payment_intent_data: {
          metadata: { tripId: trip.id },
        },
      }, { idempotencyKey: `booking/${validatedData.bookingRequestId}` });
      console.log("✅ Stripe session created:", stripeSession.id);

      await db.trip.update({
        where: { id: trip.id },
        data: { stripeCheckoutSessionId: stripeSession.id },
      });
      console.log("✅ Trip updated with Stripe session ID");

      return NextResponse.json({ url: stripeSession.url });
    } catch (stripeError: any) {
      console.error("❌ Stripe error:", stripeError);
      throw stripeError;
    }
  } catch (error: any) {
    console.error("❌ Trip creation error:", error);
    return NextResponse.json(
      { error: "Failed to create trip", message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trips = await db.trip.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tariffPlan: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(trips);
  } catch (error) {
    console.error("❌ Error fetching trips:", error);
    return NextResponse.json(
      { error: "Failed to fetch trips" },
      { status: 500 }
    );
  }
}
