import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

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
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const item = await db.faqItem.create({ data: body });
  return NextResponse.json(item, { status: 201 });
}
