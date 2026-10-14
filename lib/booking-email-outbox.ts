import { db } from "./db";
import { sendBookingEmails } from "./email";

export type BookingEmailDeliveryOutcome =
  | "sent"
  | "already-sent"
  | "not-found"
  | "failed";

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown email delivery error";
  return message.slice(0, 1_000);
}

export async function deliverBookingEmail(
  tripId: string,
): Promise<BookingEmailDeliveryOutcome> {
  const delivery = await db.bookingEmailDelivery.findUnique({
    where: { tripId },
    include: {
      trip: { include: { tariffPlan: true } },
    },
  });

  if (!delivery) return "not-found";
  if (delivery.sentAt) return "already-sent";

  const attemptAt = new Date();
  await db.bookingEmailDelivery.updateMany({
    where: { id: delivery.id, sentAt: null },
    data: {
      attempts: { increment: 1 },
      lastAttemptAt: attemptAt,
      lastError: null,
    },
  });

  const { trip } = delivery;

  try {
    const settings = await db.storeSettings.findFirst({
      select: { storeEmail: true, companyName: true },
    });
    const sent = await sendBookingEmails({
      id: trip.id,
      tripNumber: trip.tripNumber || undefined,
      status: trip.status,
      customerName: trip.passengerName || "Customer",
      customerEmail: trip.passengerEmail || "",
      customerPhone: trip.passengerPhone || "",
      pickupLocation: trip.pickupAddress,
      dropoffLocation: trip.dropoffAddress,
      pickupDate: trip.pickupDateTime || new Date(),
      pickupTime: trip.pickupDateTime
        ? new Date(trip.pickupDateTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
      passengers: trip.passengerCount || 1,
      tariffName: trip.tariffPlan?.name || "Standard",
      price: Number(trip.total),
      currency: trip.currency,
      paymentMethod: trip.paymentMethod || "STRIPE",
      paymentStatus: trip.paymentStatus,
      flightNumber: trip.flightNumber || undefined,
      notes: trip.notes || undefined,
      extras: trip.extras,
      discountAmount: Number(trip.discountAmount || 0),
      distance: trip.distance != null ? `${trip.distance.toFixed(1)} km` : undefined,
      duration: trip.duration != null ? `${trip.duration} min` : undefined,
    }, settings?.storeEmail?.trim() || process.env.ADMIN_EMAIL?.trim() || "",
    settings?.companyName || "Taxi Service");

    if (!sent) {
      throw new Error("At least one booking email could not be sent");
    }

    await db.bookingEmailDelivery.updateMany({
      where: { id: delivery.id, sentAt: null },
      data: { sentAt: new Date(), lastError: null },
    });
    return "sent";
  } catch (error) {
    await db.bookingEmailDelivery.updateMany({
      where: { id: delivery.id, sentAt: null },
      data: { lastError: errorMessage(error) },
    });
    console.error("Booking confirmation email delivery failed", {
      tripId,
      error: errorMessage(error),
    });
    return "failed";
  }
}

export async function deliverPendingBookingEmails(limit = 50) {
  const pending = await db.bookingEmailDelivery.findMany({
    where: { sentAt: null },
    select: { tripId: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const summary = {
    checked: pending.length,
    sent: 0,
    alreadySent: 0,
    failed: 0,
  };

  for (const delivery of pending) {
    const outcome = await deliverBookingEmail(delivery.tripId);
    if (outcome === "sent") summary.sent += 1;
    else if (outcome === "already-sent") summary.alreadySent += 1;
    else summary.failed += 1;
  }

  return summary;
}
