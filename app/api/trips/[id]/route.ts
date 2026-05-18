import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getOrderStatusUpdateEmailHtml } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    const trip = await db.trip.findUnique({
      where: { id: params.id },
      include: {
        tariffPlan: true,
        vehicle: true,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Allow: admin, trip owner (logged in), or trip passenger email match (guest)
    const isAdmin = session?.user?.role === "ADMIN";
    const isOwner = session?.user?.id && trip.userId === session.user.id;
    const isGuestMatch =
      !trip.userId &&
      trip.passengerEmail &&
      trip.passengerEmail !== "guest@example.com" &&
      session?.user?.email === trip.passengerEmail;

    if (!isAdmin && !isOwner && !isGuestMatch) {
      // Return limited public info for trip status page (no PII)
      return NextResponse.json({
        id: trip.id,
        tripNumber: trip.tripNumber,
        status: trip.status,
        paymentStatus: trip.paymentStatus,
        pickupDateTime: trip.pickupDateTime,
        tariffPlan: trip.tariffPlan ? { name: trip.tariffPlan.name } : null,
      });
    }

    return NextResponse.json(trip);
  } catch (error) {
    console.error("Trip fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trip" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trip = await db.trip.findUnique({
      where: { id: params.id },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Only admin or trip owner can update
    if (session.user.role !== "ADMIN" && trip.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { status, driverName, driverPhone, vehicleId, driverId } = body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (driverName !== undefined) updateData.driverName = driverName;
    if (driverPhone !== undefined) updateData.driverPhone = driverPhone;
    if (vehicleId !== undefined) updateData.vehicleId = vehicleId;
    if (driverId !== undefined) updateData.driverId = driverId || null;

    const updatedTrip = await db.trip.update({
      where: { id: params.id },
      data: updateData,
      include: {
        user: true,
        tariffPlan: true,
      },
    });

    // Send status update email if status changed
    if (status && status !== trip.status) {
      try {
        const storeSettings = await db.storeSettings.findFirst();
        const companyName = storeSettings?.companyName || "Taxi Service";

        const recipientEmail = updatedTrip.passengerEmail || updatedTrip.user?.email;

        // Don't send to guest placeholder emails
        const isGuestEmail = !recipientEmail ||
          recipientEmail === "guest@example.com" ||
          recipientEmail.endsWith("@placeholder.com");

        if (!isGuestEmail && recipientEmail) {
          const html = getOrderStatusUpdateEmailHtml(
            updatedTrip.id,
            status,
            companyName,
            updatedTrip.driverName || null
          );

          await sendEmail({
            to: recipientEmail,
            subject: `${getStatusEmoji(status)} Trip ${updatedTrip.tripNumber || updatedTrip.id} — ${status}`,
            html,
          });
        }
      } catch (emailError) {
        // Don't fail the request if email fails
        console.error("❌ Failed to send status update email:", emailError);
      }
    }

    return NextResponse.json(updatedTrip);
  } catch (error) {
    console.error("Trip update error:", error);
    return NextResponse.json(
      { error: "Failed to update trip" },
      { status: 500 }
    );
  }
}

function getStatusEmoji(status: string): string {
  const map: Record<string, string> = {
    CONFIRMED: '✅',
    IN_PROGRESS: '🚕',
    COMPLETED: '🏁',
    CANCELLED: '❌',
    REFUNDED: '💸',
  };
  return map[status] || '📋';
}
