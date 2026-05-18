import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const {
      make,
      model,
      year,
      licensePlate,
      color,
      type,
      capacity,
      luggageCapacity,
      image,
      isActive,
    } = body;

    const vehicle = await db.vehicle.update({
      where: { id },
      data: {
        make,
        model,
        year: year ? parseInt(year) : undefined,
        licensePlate,
        color,
        type,
        capacity: capacity ? parseInt(capacity) : undefined,
        luggageCapacity: luggageCapacity ? parseInt(luggageCapacity) : undefined,
        image,
        isActive,
      },
    });

    revalidatePath("/admin/vehicles");

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error("Vehicle PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update vehicle" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    await db.vehicle.delete({
      where: { id },
    });

    revalidatePath("/admin/vehicles");

    return NextResponse.json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    console.error("Vehicle DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete vehicle" },
      { status: 500 }
    );
  }
}
