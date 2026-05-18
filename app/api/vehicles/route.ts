import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: any = {};
    if (activeOnly) {
      where.isActive = true;
    }

    const vehicles = await db.vehicle.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(vehicles);
  } catch (error) {
    console.error("Vehicles GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicles" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    if (!make || !model || !licensePlate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const vehicle = await db.vehicle.create({
      data: {
        make,
        model,
        year: year ? parseInt(year) : null,
        licensePlate,
        color,
        type,
        capacity: parseInt(capacity) || 4,
        luggageCapacity: parseInt(luggageCapacity) || 2,
        image,
        isActive: isActive ?? true,
      },
    });

    revalidatePath("/admin/vehicles");

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    console.error("Vehicle POST error:", error);
    return NextResponse.json(
      { error: "Failed to create vehicle" },
      { status: 500 }
    );
  }
}
