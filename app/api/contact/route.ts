import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";

const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  subject: z.string().min(5).max(200),
  message: z.string().min(10).max(2000),
});

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
    const adminEmail = storeSettings?.storeEmail || process.env.ADMIN_EMAIL || "admin@example.com";
    const companyName = storeSettings?.companyName || "Taxi Service";

    // Send email to admin
    await sendEmail({
      to: adminEmail,
      subject: `📬 New Contact Message: ${subject}`,
      html: adminContactHtml(name, email, subject, message, companyName),
    });

    // Send confirmation email to user
    await sendEmail({
      to: email,
      subject: `Re: ${subject} — ${companyName}`,
      html: userContactHtml(name, subject, adminEmail, companyName),
    });

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

function adminContactHtml(name: string, email: string, subject: string, message: string, companyName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="background:#1e293b;border-radius:12px 12px 0 0;padding:20px 28px;">
            <table width="100%"><tr>
              <td><span style="font-size:20px;">✉️</span> <strong style="color:#BF953F;font-size:16px;">${companyName}</strong>
                <p style="margin:2px 0 0;color:#64748b;font-size:12px;">Contact Form Submission</p>
              </td>
              <td style="text-align:right;">
                <span style="background:#3b82f622;color:#93c5fd;border:1px solid #3b82f644;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;">NEW MESSAGE</span>
              </td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="background:#fff;padding:28px;">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:20px;">
              <p style="margin:0 0 10px;font-size:10px;color:#BF953F;font-weight:700;text-transform:uppercase;letter-spacing:1px;">👤 From</p>
              <p style="margin:0 0 3px;font-size:15px;font-weight:700;color:#0f172a;">${name}</p>
              <p style="margin:0;font-size:13px;color:#475569;"><a href="mailto:${email}" style="color:#3b82f6;text-decoration:none;">${email}</a></p>
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:20px;">
              <p style="margin:0 0 8px;font-size:10px;color:#BF953F;font-weight:700;text-transform:uppercase;letter-spacing:1px;">📋 Subject</p>
              <p style="margin:0;font-size:14px;font-weight:600;color:#0f172a;">${subject}</p>
            </div>
            <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px;margin-bottom:20px;">
              <p style="margin:0 0 8px;font-size:10px;color:#0284c7;font-weight:700;text-transform:uppercase;letter-spacing:1px;">💬 Message</p>
              <p style="margin:0;font-size:14px;color:#0c4a6e;line-height:1.7;white-space:pre-wrap;">${message}</p>
            </div>
            <div style="text-align:center;">
              <a href="mailto:${email}?subject=Re: ${subject}" 
                style="display:inline-block;background:linear-gradient(135deg,#BF953F,#FCF6BA,#B38728);color:#0f172a;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">
                Reply to ${name} →
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#e2e8f0;border-radius:0 0 12px 12px;padding:14px 28px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:11px;">Automated message from ${companyName} contact form</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function userContactHtml(name: string, subject: string, adminEmail: string, companyName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#92400e 0%,#BF953F 40%,#FCF6BA 60%,#B38728 80%,#7a5c1e 100%);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
            <div style="font-size:32px;margin-bottom:8px;">🚕</div>
            <h1 style="margin:0;color:#0f172a;font-size:22px;font-weight:800;">${companyName}</h1>
            <p style="margin:6px 0 0;color:#1e293b;font-size:13px;opacity:0.8;">We received your message</p>
          </td>
        </tr>
        <tr>
          <td style="background:#1e293b;padding:36px 40px;">
            <p style="margin:0 0 6px;color:#e2e8f0;font-size:17px;font-weight:600;">Hi ${name} 👋</p>
            <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.6;">
              Thank you for getting in touch. We've received your message and will respond as soon as possible — typically within 24 hours.
            </p>
            <div style="background:#0f172a;border:1px solid #334155;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
              <p style="margin:0 0 6px;font-size:10px;color:#BF953F;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Your Subject</p>
              <p style="margin:0;font-size:14px;color:#f8fafc;font-weight:500;">${subject}</p>
            </div>
            <p style="margin:0;font-size:13px;color:#475569;text-align:center;line-height:1.6;">
              You can also reach us directly at<br>
              <a href="mailto:${adminEmail}" style="color:#BF953F;font-weight:600;text-decoration:none;">${adminEmail}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#0f172a;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;border-top:1px solid #1e293b;">
            <p style="margin:0;color:#334155;font-size:12px;">© ${new Date().getFullYear()} <strong style="color:#475569;">${companyName}</strong>. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
