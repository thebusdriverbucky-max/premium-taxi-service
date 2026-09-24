import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { faqSchema } from "@/lib/validations/faq";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const items = await db.faqItem.findMany({
    where: isAdmin ? {} : { isVisible: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = faqSchema.parse(await request.json());
    const item = await db.faqItem.create({ data: body });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid FAQ data" }, { status: 400 });
    }
    console.error("FAQ create error:", error);
    return NextResponse.json({ error: "Failed to create FAQ" }, { status: 500 });
  }
}
