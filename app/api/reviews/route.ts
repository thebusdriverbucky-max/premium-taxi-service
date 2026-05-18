import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const isAdmin = session?.user?.role === "ADMIN";

    const reviews = await prisma.taxiReview.findMany({
      where: isAdmin ? {} : { isApproved: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Failed to fetch reviews:", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // note: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() is safer
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rateLimit = await checkRateLimit(ip, "reviews");
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const session = await auth();
    const isAdmin = session?.user?.role === "ADMIN";

    const body = await request.json();
    const { authorName, rating, content, tripId, authorImage, tripType, isApproved } = body;

    const DOMPurify = require('isomorphic-dompurify');
    const sanitizedContent = DOMPurify.sanitize(content);

    if (!authorName || !sanitizedContent || !rating) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!isAdmin && (sanitizedContent.length < 10 || sanitizedContent.length > 500)) {
      return NextResponse.json({ error: "Invalid content length" }, { status: 400 });
    }

    // Проверить что поездка существует и имеет статус COMPLETED (если tripId передан)
    if (tripId) {
      const trip = await prisma.trip.findUnique({ where: { id: tripId } });
      if (!trip || trip.status !== "COMPLETED") {
        return NextResponse.json({ error: "Review only allowed for completed trips" }, { status: 403 });
      }
    }

    const review = await prisma.taxiReview.create({
      data: {
        authorName,
        authorImage,
        rating: Math.min(5, Math.max(1, parseInt(rating))),
        content: sanitizedContent,
        tripType,
        isApproved: isAdmin ? (isApproved ?? false) : false,
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error("Failed to create review:", error);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
