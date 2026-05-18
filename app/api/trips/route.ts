import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import { createOrderSchema } from "@/lib/validations";
import { generateOrderNumber } from "@/lib/order-number";
import { z } from "zod";
import { sendBookingEmails } from "@/lib/email";

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
    console.log("📦 Received trip request body:", JSON.stringify(body, null, 2));

    // Base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || `https://${request.headers.get("host")}`;
    console.log("🌐 Base URL:", baseUrl);

    // Zod Validation
    let validatedData;
    try {
      validatedData = createOrderSchema.parse(body);
      console.log("✅ Validation successful:", JSON.stringify(validatedData, null, 2));
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("❌ Validation failed:", error.issues);
        return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
      }
      throw error;
    }

    const {
      items,
      guestEmail,
      pickupAddress,
      dropoffAddress,
      pickupDateTime,
      passengerCount,
      flightNumber,
      notes,
      couponCode,
      paymentMethod
    } = validatedData;

    if (!userId && !guestEmail) {
      console.error("❌ Missing userId and guestEmail");
      return NextResponse.json({ error: "Email is required for guest checkout" }, { status: 400 });
    }

    // Assume the first item's productId is the tariffPlanId
    const tariffPlanId = items[0]?.productId;
    console.log("🔍 Looking for tariff plan:", tariffPlanId);
    const tariffPlan = await db.tariffPlan.findUnique({
      where: { id: tariffPlanId },
    });

    if (!tariffPlan) {
      console.error("❌ Tariff plan not found:", tariffPlanId);
      return NextResponse.json({ error: "Tariff plan not found" }, { status: 400 });
    }
    console.log("✅ Tariff plan found:", tariffPlan.name);

    const currency = tariffPlan.currency || "EUR";

    // ── SERVER-SIDE PRICE CALCULATION ──────────────────────────────
    // Get store settings for surcharges
    const storeSettings = await db.storeSettings.findFirst();
    const airportSurcharge = Number(storeSettings?.airportSurcharge ?? 5);
    const luggageFee = Number(storeSettings?.luggageFee ?? 5);
    const childSeatFee = Number(storeSettings?.childSeatFee ?? 5);

    // Parse client-sent extras from notes (to know what was selected)
    // Notes format: "[EXTRAS: ADD_LUGGAGE:1:Large, CHILD_SEAT:1]\nNotes for driver: ..."
    const notesStr = validatedData.notes || "";
    const extrasMatch = notesStr.match(/\[EXTRAS:\s*([^\]]+)\]/);
    let hasAirport = false;
    let luggageCount = 0;
    let childSeatCount = 0;

    if (extrasMatch) {
      extrasMatch[1].split(',').map((s: string) => s.trim()).forEach((extra: string) => {
        if (extra.startsWith('ADD_LUGGAGE')) {
          luggageCount += parseInt(extra.split(':')?.[1] || '1', 10);
        } else if (extra.startsWith('CHILD_SEAT')) {
          childSeatCount += parseInt(extra.split(':')?.[1] || '1', 10);
        }
      });
    }

    // Detect airport from pickup/dropoff address
    const pickupStr = (validatedData.pickupAddress || '').toLowerCase();
    const dropoffStr = (validatedData.dropoffAddress || '').toLowerCase();
    hasAirport = /airport/.test(pickupStr) || /airport/.test(dropoffStr);

    // Calculate distance-based price
    // Client sends distance via items.price as the calculated base price
    // We use tariffPlan.basePrice + pricePerKm * distance as floor
    const clientSentBasePrice = Number(validatedData.items?.[0]?.price ?? 0);
    const tariffBase = Number(tariffPlan.basePrice);
    const minPrice = Number((tariffPlan as any).minPrice ?? 0);

    // Use max of: client-calculated price vs tariff base price
    // This prevents underpricing but allows legitimate calculation
    const tripBasePrice = Math.max(clientSentBasePrice, tariffBase);
    const finalBasePrice = minPrice > 0 ? Math.max(tripBasePrice, minPrice) : tripBasePrice;

    // Add extras
    const extrasTotal =
      (hasAirport ? airportSurcharge : 0) +
      (luggageCount * luggageFee) +
      (childSeatCount * childSeatFee);

    let total = Number((finalBasePrice + extrasTotal).toFixed(2));
    const computedBasePrice = total;
    // ── END SERVER-SIDE PRICE CALCULATION ──────────────────────────

    console.log("💰 Server-calculated price:", {
      tariffBase,
      clientSentBasePrice,
      finalBasePrice,
      extrasTotal,
      total,
    });
    let discountAmount = 0;
    let discountCodeId = null;

    // Validate Coupon if provided
    if (couponCode) {
      console.log("🎟️ Validating coupon:", couponCode);
      const coupon = await db.discountCode.findUnique({
        where: { code: couponCode.toUpperCase() },
      });

      if (coupon && coupon.isActive && (!coupon.expiresAt || new Date() < coupon.expiresAt)) {
        console.log("✅ Coupon valid:", coupon.code);
        discountCodeId = coupon.id;
        if (coupon.type === "FIXED") {
          discountAmount = coupon.value;
        } else if (coupon.type === "PERCENT") {
          discountAmount = (total * coupon.value) / 100;
        }
        total = Math.max(0, total - discountAmount);
      } else {
        console.warn("⚠️ Coupon invalid or expired:", couponCode);
      }
    }

    // Generate trip number
    let tripNumber;
    try {
      tripNumber = await generateOrderNumber(); // We can reuse this or create a new one
      console.log("🔢 Generated trip number:", tripNumber);
    } catch (err) {
      tripNumber = `TRP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      console.warn("⚠️ Failed to generate trip number, using fallback:", tripNumber);
    }

    // Create trip
    console.log("💾 Creating trip in database...");
    const trip = await db.trip.create({
      data: {
        tripNumber,
        userId,
        passengerName: validatedData.shippingAddress
          ? `${validatedData.shippingAddress.firstName} ${validatedData.shippingAddress.lastName}`.trim()
          : undefined,
        passengerEmail: guestEmail || session?.user?.email,
        passengerPhone: validatedData.shippingAddress?.phone,
        pickupAddress: pickupAddress || "N/A",
        dropoffAddress: dropoffAddress || "N/A",
        pickupDateTime: pickupDateTime ? new Date(pickupDateTime) : null,
        scheduledAt: pickupDateTime ? new Date(pickupDateTime) : null,
        passengerCount,
        flightNumber,
        notes,
        tariffPlanId,
        basePrice: computedBasePrice, // Original price before discount
        discountAmount,
        discountCodeId,
        total,
        currency,
        status: "PENDING",
        paymentStatus: "unpaid",
      },
      include: {
        tariffPlan: true,
      },
    });
    console.log("✅ Trip created:", trip.id);

    // Increment coupon usage if couponCode was used
    if (couponCode) {
      try {
        await db.coupon.updateMany({
          where: { code: couponCode.toUpperCase() },
          data: { used: { increment: 1 } },
        });
      } catch { /* non-critical */ }
    }

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
          paymentStatus: trip.paymentStatus === 'paid' ? 'PAID' : 'PENDING',
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
                description: `${pickupAddress} to ${dropoffAddress}`,
              },
              unit_amount: Math.round(Number(total) * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${baseUrl}/trips/${trip.id}?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/booking?canceled=true`,
        metadata: {
          tripId: trip.id,
          orderId: trip.id, // Keep for backward compatibility with webhook
        },
      });
      console.log("✅ Stripe session created:", stripeSession.id);

      await db.trip.update({
        where: { id: trip.id },
        data: { stripePaymentIntentId: stripeSession.id },
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
