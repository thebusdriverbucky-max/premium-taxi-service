import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { z } from "zod";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { getEmailDeliveryStatus } from "@/lib/email-config";
import { checkRateLimit } from "@/lib/rate-limit";

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rateLimit = await checkRateLimit(ip, "forgotPassword");

    if (!rateLimit.success) {
      return new NextResponse("Too Many Requests", { status: 429 });
    }

    // Checked before the user lookup so the response never depends on whether an account exists.
    if (getEmailDeliveryStatus(process.env).state === "not-configured") {
      return NextResponse.json(
        {
          code: "EMAIL_NOT_CONFIGURED",
          message: "Password reset by email is not available right now. Please contact us for help.",
        },
        { status: 503 },
      );
    }

    const body = await req.json();
    const { email } = forgotPasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return 200 even when the user does not exist so registered emails are not revealed
      return NextResponse.json({ message: "If an account exists with this email, you will receive a password reset link." });
    }

    // The raw token only goes into the email link; the database stores its SHA-256 hash.
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { email },
      data: {
        resetToken: hashedResetToken,
        resetTokenExpiry,
      },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

    const settings = await prisma.storeSettings.findFirst({
      select: { companyName: true, storeEmail: true },
    });
    await sendPasswordResetEmail(
      email,
      resetUrl,
      settings?.companyName || "Taxi Service",
      settings?.storeEmail || process.env.ADMIN_EMAIL,
    );

    return NextResponse.json({ message: "If an account exists with this email, you will receive a password reset link." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid email" }, { status: 400 });
    }
    console.error("Forgot password error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
