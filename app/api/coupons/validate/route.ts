// app/api/coupons/validate/route.ts

import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const identifier = session?.user?.id || request.headers.get("x-forwarded-for") || "127.0.0.1";

    const rateLimit = await checkRateLimit(identifier, "coupons");
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Code required" },
        { status: 400 }
      );
    }

    const coupon = await db.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon || !coupon.isActive) {
      return NextResponse.json({ valid: false, error: "Coupon not found or inactive" });
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return NextResponse.json({ valid: false, error: "Coupon has expired" });
    }

    // Check usage limit
    if (coupon.usageLimit !== null && coupon.used >= coupon.usageLimit) {
      return NextResponse.json({ valid: false, error: "Coupon usage limit reached" });
    }

    // Check minimum order amount (pass amount from client for validation)
    const orderAmount = Number(body.amount ?? 0);
    if (orderAmount > 0 && Number(coupon.minAmount) > 0 && orderAmount < Number(coupon.minAmount)) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order amount is ${coupon.minAmount} for this coupon`
      });
    }

    // Calculate discount
    let discount = 0;
    const couponValue = Number(coupon.value);
    if (coupon.type === "FIXED") {
      discount = couponValue;
    } else if (coupon.type === "PERCENT") {
      discount = (orderAmount * couponValue) / 100;
      // if (coupon.maxDiscount) ... // Not in schema
    }

    const finalAmount = Math.max(0, orderAmount - discount);

    return NextResponse.json({
      valid: true,
      discount,
      finalAmount,
      couponId: coupon.id,
      code: coupon.code,
      type: coupon.type, // "FIXED" | "PERCENT"
      value: couponValue,
    });
  } catch (error) {
    console.error("Coupon validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate coupon" },
      { status: 500 }
    );
  }
}

