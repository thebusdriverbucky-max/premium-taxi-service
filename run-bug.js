const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const tariffPlan = await prisma.tariffPlan.findFirst();
    const tariffPlanId = tariffPlan.id;

    const validatedData = {
      items: [{ productId: tariffPlanId, quantity: 1, price: 10 }],
      total: 10,
      guestEmail: "test@example.com",
      shippingAddress: {
        firstName: "John",
        lastName: "Doe",
        email: "test@example.com",
        phone: "+35712345678",
        street: "Airport",
        city: "City",
        state: "",
        postalCode: "0000",
        country: "Cyprus"
      },
      pickupAddress: "Airport",
      dropoffAddress: "City Center",
      pickupDateTime: "2024-05-15T10:30:00",
      passengerCount: 1,
      flightNumber: "",
      notes: "[EXTRAS: ADD_LUGGAGE:1:Large, CHILD_SEAT:1]\nNotes for driver: test",
      paymentMethod: "STRIPE",
      couponCode: undefined
    };

    const storeSettings = await prisma.storeSettings.findFirst();
    const airportSurcharge = Number(storeSettings?.airportSurcharge ?? 5);
    const luggageFee = Number(storeSettings?.luggageFee ?? 5);
    const childSeatFee = Number(storeSettings?.childSeatFee ?? 5);

    const notesStr = validatedData.notes || "";
    const extrasMatch = notesStr.match(/\[EXTRAS:\s*([^\]]+)\]/);
    let hasAirport = false;
    let luggageCount = 0;
    let childSeatCount = 0;

    if (extrasMatch) {
      extrasMatch[1].split(',').map(s => s.trim()).forEach(extra => {
        if (extra.startsWith('ADD_LUGGAGE')) {
          luggageCount += parseInt(extra.split(':')?.[1] || '1', 10);
        } else if (extra.startsWith('CHILD_SEAT')) {
          childSeatCount += parseInt(extra.split(':')?.[1] || '1', 10);
        }
      });
    }

    const pickupStr = (validatedData.pickupAddress || '').toLowerCase();
    const dropoffStr = (validatedData.dropoffAddress || '').toLowerCase();
    hasAirport = /airport/.test(pickupStr) || /airport/.test(dropoffStr);

    const clientSentBasePrice = Number(validatedData.items?.[0]?.price ?? 0);
    const tariffBase = Number(tariffPlan.basePrice);
    const minPrice = Number(tariffPlan.minPrice ?? 0);

    const tripBasePrice = Math.max(clientSentBasePrice, tariffBase);
    const finalBasePrice = minPrice > 0 ? Math.max(tripBasePrice, minPrice) : tripBasePrice;

    const extrasTotal =
      (hasAirport ? airportSurcharge : 0) +
      (luggageCount * luggageFee) +
      (childSeatCount * childSeatFee);

    let total = Number((finalBasePrice + extrasTotal).toFixed(2));
    const computedBasePrice = total;

    let discountAmount = 0;
    let discountCodeId = null;

    const trip = await prisma.trip.create({
      data: {
        tripNumber: "TRP-TEST123",
        userId: undefined,
        passengerName: validatedData.shippingAddress
          ? `${validatedData.shippingAddress.firstName} ${validatedData.shippingAddress.lastName}`.trim()
          : undefined,
        passengerEmail: validatedData.guestEmail,
        passengerPhone: validatedData.shippingAddress?.phone,
        pickupAddress: validatedData.pickupAddress || "N/A",
        dropoffAddress: validatedData.dropoffAddress || "N/A",
        pickupDateTime: validatedData.pickupDateTime ? new Date(validatedData.pickupDateTime) : null,
        scheduledAt: validatedData.pickupDateTime ? new Date(validatedData.pickupDateTime) : null,
        passengerCount: validatedData.passengerCount,
        flightNumber: validatedData.flightNumber,
        notes: validatedData.notes,
        tariffPlanId,
        basePrice: computedBasePrice,
        discountAmount,
        discountCodeId,
        total,
        currency: tariffPlan.currency || "EUR",
        status: "PENDING",
        paymentStatus: "unpaid",
      },
      include: {
        tariffPlan: true,
      },
    });
    console.log("Success!", trip.id);
  } catch (err) {
    console.error("Error creating trip:", err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
