import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { getEmailDeliveryStatus } from "@/lib/email-config";
import { getAdminContactEmailHtml, getCustomerContactEmailHtml } from "@/lib/email-templates";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100).refine(value => !/[\r\n]/.test(value)),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  subject: z.string().trim().min(5).max(200).refine(value => !/[\r\n]/.test(value)),
  message: z.string().trim().min(10).max(2000),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const rateLimit = await checkRateLimit(ip, "contact");

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { name, email, subject, message } = contactSchema.parse(body);

    const storeSettings = await db.storeSettings.findFirst();
    if (getEmailDeliveryStatus(process.env).state === "not-configured") {
      return NextResponse.json(
        {
          error: "Our contact form is temporarily unavailable. Please reach us by phone or email.",
          code: "EMAIL_NOT_CONFIGURED",
          contact: {
            phone: storeSettings?.phoneNumber?.trim() || null,
            email: storeSettings?.storeEmail?.trim() || null,
          },
        },
        { status: 503 },
      );
    }
    const adminEmail = storeSettings?.storeEmail?.trim() || process.env.ADMIN_EMAIL?.trim();
    if (!adminEmail || !z.string().email().safeParse(adminEmail).success) {
      return NextResponse.json({ error: "Contact message delivery is not configured. Please use another contact method." }, { status: 503 });
    }
    const companyName = storeSettings?.companyName || "Taxi Service";

    const adminDelivery = await sendEmail({
      to: adminEmail,
      subject: `📬 New Contact Message: ${subject}`,
      html: getAdminContactEmailHtml(name, email, subject, message, companyName),
      replyTo: email,
    });

    if (adminDelivery.status !== "sent") {
      return NextResponse.json(
        { error: "Message delivery is temporarily unavailable" },
        { status: 502 },
      );
    }

    const confirmationDelivery = await sendEmail({
      to: email,
      subject: `Re: ${subject} — ${companyName}`,
      html: getCustomerContactEmailHtml(name, subject, adminEmail, companyName),
      replyTo: adminEmail,
    });

    if (confirmationDelivery.status !== "sent") {
      console.error("Contact confirmation email was not delivered", { email });
    }

    return NextResponse.json(
      { success: true, message: "Message sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
