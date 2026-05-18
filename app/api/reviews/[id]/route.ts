import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db as prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { authorName, authorImage, rating, content, tripType, isApproved } = body;

    const updateData: any = {};
    if (authorName !== undefined) updateData.authorName = authorName;
    if (authorImage !== undefined) updateData.authorImage = authorImage;
    if (rating !== undefined) updateData.rating = Math.min(5, Math.max(1, parseInt(rating)));
    if (content !== undefined) updateData.content = content;
    if (tripType !== undefined) updateData.tripType = tripType;
    if (isApproved !== undefined) updateData.isApproved = Boolean(isApproved);

    const review = await prisma.taxiReview.update({
      where: { id: params.id },
      data: updateData,
    });

    revalidatePath("/");
    revalidatePath("/admin/reviews");
    return NextResponse.json(review);
  } catch (error) {
    console.error("Failed to update review:", error);
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.taxiReview.delete({
      where: { id: params.id },
    });

    revalidatePath("/");
    revalidatePath("/admin/reviews");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete review:", error);
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
  }
}
