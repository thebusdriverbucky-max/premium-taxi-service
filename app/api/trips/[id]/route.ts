import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getOrderStatusUpdateEmailHtml } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

const adminTripUpdateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "REFUNDED"]).optional(),
  driverName: z.string().trim().max(120).nullable().optional(),
  driverPhone: z.string().trim().max(50).nullable().optional(),
  vehicleId: z.string().cuid().nullable().optional(),
  driverId: z.string().cuid().nullable().optional(),
}).strict().refine(data => Object.keys(data).length > 0, {
  message: "At least one field is required",
});

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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const trip = await db.trip.findUnique({
      where: { id: params.id },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const body = adminTripUpdateSchema.parse(await request.json());
    const { status, driverName, driverPhone, vehicleId, driverId } = body;

    const updateData: {
      status?: typeof status;
      driverName?: string | null;
      driverPhone?: string | null;
      vehicleId?: string | null;
      driverId?: string | null;
    } = {};
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
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid trip update data" }, { status: 400 });
    }
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
