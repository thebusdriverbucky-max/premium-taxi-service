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

    const tariffs = await db.tariffPlan.findMany({
      where,
      orderBy: {
        sortOrder: "asc",
      },
    });

    return NextResponse.json(tariffs);
  } catch (error) {
    console.error("Tariffs GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tariffs" },
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
      name,
      description,
      vehicleType,
      basePrice,
      pricePerKm,
      pricePerMin,
      currency,
      maxPassengers,
      maxLuggage,
      features,
      minPrice,
      zones,
      isActive,
      isFeatured,
    } = body;

    if (!name || !basePrice || !pricePerKm) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Simple slug generation
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "") + "-" + Math.random().toString(36).substring(2, 7);

    const tariff = await db.tariffPlan.create({
      data: {
        name,
        slug,
        description,
        vehicleType,
        basePrice: parseFloat(basePrice),
        pricePerKm: parseFloat(pricePerKm),
        pricePerMin: parseFloat(pricePerMin || 0),
        minPrice: parseFloat(minPrice || 0),
        zones: Array.isArray(zones) ? zones : (zones && typeof zones === 'string' && zones.trim() !== "" ? JSON.parse(zones) : null),
        currency: currency || "EUR",
        maxPassengers: parseInt(maxPassengers) || 4,
        maxLuggage: parseInt(maxLuggage) || 2,
        features: Array.isArray(features) ? features : features?.split(",").map((f: string) => f.trim()).filter(Boolean) || [],
        isActive: isActive ?? true,
        isFeatured: isFeatured ?? false,
      },
    });

    revalidatePath("/");
    revalidatePath("/admin/tariffs");
    revalidatePath("/booking");

    return NextResponse.json(tariff, { status: 201 });
  } catch (error) {
    console.error("Tariff POST error:", error);
    return NextResponse.json(
      { error: "Failed to create tariff" },
      { status: 500 }
    );
  }
}
