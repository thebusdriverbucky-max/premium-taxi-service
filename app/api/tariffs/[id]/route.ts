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

    const id = params.id;
    const body = await request.json();

    const updateData: any = { ...body };

    // Convert numeric fields if they exist in body
    if (updateData.basePrice !== undefined) updateData.basePrice = parseFloat(updateData.basePrice);
    if (updateData.pricePerKm !== undefined) updateData.pricePerKm = parseFloat(updateData.pricePerKm);
    if (updateData.pricePerMin !== undefined) updateData.pricePerMin = parseFloat(updateData.pricePerMin);
    if (updateData.minPrice !== undefined) updateData.minPrice = parseFloat(updateData.minPrice);
    if (updateData.maxPassengers !== undefined) updateData.maxPassengers = parseInt(updateData.maxPassengers);
    if (updateData.maxLuggage !== undefined) updateData.maxLuggage = parseInt(updateData.maxLuggage);

    if (updateData.zones !== undefined) {
      if (Array.isArray(updateData.zones)) {
        // Already an array, use it as is
      } else if (typeof updateData.zones === 'string' && updateData.zones.trim() !== "") {
        try {
          updateData.zones = JSON.parse(updateData.zones);
        } catch (e) {
          updateData.zones = null;
        }
      } else {
        updateData.zones = null;
      }
    }

    if (typeof updateData.features === 'string') {
      updateData.features = updateData.features.split(",").map((f: string) => f.trim()).filter(Boolean);
    }

    if (updateData.name && !updateData.slug) {
      updateData.slug = updateData.name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "") + "-" + Math.random().toString(36).substring(2, 7);
    }

    const tariff = await db.tariffPlan.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/");
    revalidatePath("/admin/tariffs");
    revalidatePath("/booking");

    return NextResponse.json(tariff);
  } catch (error) {
    console.error("Tariff PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update tariff" },
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

    const id = params.id;

    await db.tariffPlan.delete({
      where: { id },
    });

    revalidatePath("/");
    revalidatePath("/admin/tariffs");
    revalidatePath("/booking");

    return NextResponse.json({ message: "Tariff deleted successfully" });
  } catch (error) {
    console.error("Tariff DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete tariff" },
      { status: 500 }
    );
  }
}
