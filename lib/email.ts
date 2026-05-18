import { Resend } from 'resend';
import DOMPurify from 'isomorphic-dompurify';
import {
  getOrderConfirmationEmailHtml,
  getOrderStatusUpdateEmailHtml,
  getPasswordResetEmailHtml,
} from './email-templates';

function escapeHtml(unsafe: string) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export const sendEmail = async (data: EmailPayload) => {
  if (!process.env.RESEND_API_KEY) {
    console.log('⚠️ RESEND_API_KEY not set. Logging email to console.');
    console.log('📧 [MOCK EMAIL] To:', data.to);
    console.log('Subject:', data.subject);
    console.log('HTML:', data.html);
    return { id: 'mock-id' };
  }

  try {
    const { data: emailData, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject: data.subject,
      html: data.html,
    });

    if (error) {
      console.error('❌ Error sending email:', error);
      return null;
    }

    console.log(`📧 Email sent: ${emailData?.id}`);
    return emailData;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return null;
  }
};

export const sendOrderConfirmationEmail = async (
  userEmail: string,
  orderData: {
    orderNumber: string;
    orderId: string;
    total: number;
    subtotal?: number;
    tax?: number;
    shippingCost?: number;
    storeName?: string;
    currencySymbol?: string;
    items: { name: string; qty: number; price: number }[]
  }
) => {
  const storeName = orderData.storeName || process.env.NEXT_PUBLIC_STORE_NAME || 'Store';
  const supportEmail = process.env.STORE_SUPPORT_EMAIL || 'support@example.com';
  const storeUrl = process.env.NEXT_PUBLIC_STORE_URL || '';
  const currencySymbol = orderData.currencySymbol || process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';

  const html = getOrderConfirmationEmailHtml({
    orderNumber: orderData.orderNumber,
    orderId: orderData.orderId,
    total: orderData.total,
    subtotal: orderData.subtotal,
    tax: orderData.tax,
    shippingCost: orderData.shippingCost,
    items: orderData.items,
    storeName,
    supportEmail,
    storeUrl,
    currencySymbol,
  });

  return sendEmail({
    to: userEmail,
    subject: `Order Confirmation ${orderData.orderNumber}`,
    html,
  });
};

export const sendOrderStatusUpdateEmail = async (
  userEmail: string,
  orderId: string,
  status: string,
  trackingNumber?: string | null
) => {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'Store';
  const html = getOrderStatusUpdateEmailHtml(orderId, status, storeName, trackingNumber);

  return sendEmail({
    to: userEmail,
    subject: `Order Status Update #${orderId.slice(0, 8)}`,
    html,
  });
};

export const sendPasswordResetEmail = async (userEmail: string, resetLink: string) => {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'Store';
  const html = getPasswordResetEmailHtml(resetLink, storeName);

  return sendEmail({
    to: userEmail,
    subject: 'Password Reset Request',
    html,
  });
};

export interface TripEmailData {
  id: string;
  tripNumber?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: Date | string;
  pickupTime?: string;
  passengers?: number;
  tariffName?: string;
  price: number;
  currency?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  flightNumber?: string;
  notes?: string;
  distance?: string;
  duration?: string;
}

function getCurrencySymbol(currency?: string): string {
  switch (currency?.toUpperCase()) {
    case 'USD': return '$';
    case 'GBP': return '£';
    case 'CAD': return 'CA$';
    default: return '€';
  }
}

function parseExtras(notes?: string | null): { label: string; detail: string }[] {
  if (!notes) return [];
  const match = notes.match(/\[EXTRAS:\s*([^\]]+)\]/);
  if (!match) return [];
  return match[1].split(',').map(s => s.trim()).flatMap(extra => {
    if (extra.startsWith('ADD_LUGGAGE')) {
      const p = extra.split(':');
      return [{ label: '🧳 Extra Luggage', detail: `${p[1] || 1}× ${p[2] || 'Standard'}` }];
    }
    if (extra.startsWith('CHILD_SEAT')) {
      const p = extra.split(':');
      return [{ label: '👶 Child Seat', detail: `${p[1] || 1}×` }];
    }
    return [];
  });
}

function getCleanNotes(notes?: string | null): string {
  if (!notes) return '';
  return notes
    .replace(/\[EXTRAS:[^\]]+\]\n?/, '')
    .replace(/^Notes for driver:\s*/i, '')
    .trim();
}

function formatBookingDate(date: Date | string, time?: string): string {
  try {
    const d = new Date(date);
    const dateStr = d.toLocaleDateString('en-GB', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
    });
    return time ? `${dateStr} at ${time}` : dateStr;
  } catch {
    return String(date);
  }
}

export const buildCustomerEmailHtml = (data: TripEmailData, companyName: string): string => {
  const sym = getCurrencySymbol(data.currency);
  const extras = parseExtras(data.notes);
  const cleanNotes = escapeHtml(getCleanNotes(data.notes));
  const tripRef = escapeHtml(data.tripNumber || data.id.slice(-6).toUpperCase());
  const scheduledStr = escapeHtml(formatBookingDate(data.pickupDate, data.pickupTime));
  const adminUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
  const escapedCustomerName = escapeHtml(data.customerName);
  const escapedPickupLocation = escapeHtml(data.pickupLocation);
  const escapedDropoffLocation = escapeHtml(data.dropoffLocation);
  const escapedFlightNumber = escapeHtml(data.flightNumber || '');
  const escapedTariffName = escapeHtml(data.tariffName || 'Standard');

  const extrasRows = extras.map(e =>
    `<tr>
      <td style="padding:6px 12px;font-size:13px;color:#94a3b8;">${escapeHtml(e.label)}</td>
      <td style="padding:6px 12px;font-size:13px;color:#f8fafc;">${escapeHtml(e.detail)}</td>
    </tr>`
  ).join('');

  const flightRow = escapedFlightNumber
    ? `<tr>
        <td style="padding:6px 12px;font-size:13px;color:#94a3b8;">✈️ Flight</td>
        <td style="padding:6px 12px;font-size:13px;color:#f8fafc;font-weight:bold;">${escapedFlightNumber}</td>
      </tr>`
    : '';

  const notesRow = cleanNotes
    ? `<tr>
        <td style="padding:6px 12px;font-size:13px;color:#94a3b8;vertical-align:top;">📝 Notes</td>
        <td style="padding:6px 12px;font-size:13px;color:#cbd5e1;font-style:italic;">${cleanNotes}</td>
      </tr>`
    : '';

  const paymentBadge = data.paymentStatus === 'PAID'
    ? `<span style="background:#16a34a22;color:#4ade80;border:1px solid #16a34a44;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;">PAID</span>`
    : `<span style="background:#d9770622;color:#fbbf24;border:1px solid #d9770644;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;">${data.paymentStatus || 'PENDING'}</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Booking Confirmed — ${companyName}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#92400e 0%,#BF953F 40%,#FCF6BA 60%,#B38728 80%,#7a5c1e 100%);border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
              <div style="font-size:36px;margin-bottom:8px;">🚕</div>
              <h1 style="margin:0;color:#0f172a;font-size:24px;font-weight:800;letter-spacing:-0.5px;">${companyName}</h1>
              <p style="margin:6px 0 0;color:#1e293b;font-size:14px;opacity:0.8;">Booking Confirmation</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#1e293b;padding:36px 40px;">

              <!-- Greeting -->
              <p style="margin:0 0 6px;color:#e2e8f0;font-size:18px;font-weight:600;">Hi ${escapedCustomerName} 👋</p>
              <p style="margin:0 0 28px;color:#94a3b8;font-size:14px;line-height:1.6;">
                Your booking <strong style="color:#BF953F;">#${tripRef}</strong> has been received and is being processed.
                Our driver will contact you to confirm the details.
              </p>

              <!-- ROUTE CARD -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border:1px solid #334155;border-radius:12px;margin-bottom:20px;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #1e3a5f;">
                    <div style="font-size:10px;color:#BF953F;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">Your Route</div>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:24px;padding-right:12px;vertical-align:top;padding-top:2px;">
                          <div style="width:12px;height:12px;background:#4ade80;border-radius:50%;margin-top:2px;"></div>
                        </td>
                        <td style="padding-bottom:16px;">
                          <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Pickup</p>
                          <p style="margin:2px 0 0;font-size:14px;color:#f8fafc;font-weight:500;">${escapedPickupLocation}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="width:24px;padding-right:12px;vertical-align:top;padding-top:2px;">
                          <div style="width:12px;height:12px;background:#f59e0b;border-radius:3px;margin-top:2px;"></div>
                        </td>
                        <td>
                          <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Dropoff</p>
                          <p style="margin:2px 0 0;font-size:14px;color:#f8fafc;font-weight:500;">${escapedDropoffLocation}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- TRIP DETAILS TABLE -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border:1px solid #334155;border-radius:12px;margin-bottom:20px;overflow:hidden;">
                <tr><td colspan="2" style="padding:12px 16px 8px;border-bottom:1px solid #1e293b;">
                  <span style="font-size:10px;color:#BF953F;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Trip Details</span>
                </td></tr>
                <tr>
                  <td style="padding:6px 12px;font-size:13px;color:#94a3b8;">🗓️ Scheduled</td>
                  <td style="padding:6px 12px;font-size:13px;color:#f8fafc;font-weight:600;">${scheduledStr}</td>
                </tr>
                <tr style="background:#ffffff04;">
                  <td style="padding:6px 12px;font-size:13px;color:#94a3b8;">🚗 Vehicle</td>
                  <td style="padding:6px 12px;font-size:13px;color:#f8fafc;">${escapedTariffName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 12px;font-size:13px;color:#94a3b8;">👤 Passengers</td>
                  <td style="padding:6px 12px;font-size:13px;color:#f8fafc;">${data.passengers || 1}</td>
                </tr>
                ${flightRow}
                ${extrasRows}
                ${notesRow}
              </table>

              <!-- PRICE BOX -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#BF953F15,#92400e10);border:1px solid #BF953F33;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Total Amount</p>
                          <p style="margin:4px 0 0;font-size:34px;font-weight:800;color:#BF953F;">${sym}${data.price}</p>
                        </td>
                        <td style="text-align:right;">
                          <p style="margin:0 0 6px;font-size:12px;color:#64748b;">${data.paymentMethod === 'CASH' ? '💵 Cash on Arrival' : '💳 Card Payment'}</p>
                          ${paymentBadge}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- HELP TEXT -->
              <p style="margin:0;font-size:13px;color:#475569;text-align:center;line-height:1.6;">
                Questions or changes? Reply to this email or contact us directly.<br>
                We look forward to serving you! 🚕
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#0f172a;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;border-top:1px solid #1e293b;">
              <p style="margin:0;color:#334155;font-size:12px;">
                © ${new Date().getFullYear()} <strong style="color:#475569;">${companyName}</strong>. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const buildAdminEmailHtml = (data: TripEmailData, companyName: string = 'Taxi Service'): string => {
  const sym = getCurrencySymbol(data.currency);
  const extras = parseExtras(data.notes);
  const cleanNotes = escapeHtml(getCleanNotes(data.notes));
  const tripRef = escapeHtml(data.tripNumber || data.id.slice(-6).toUpperCase());
  const scheduledStr = escapeHtml(formatBookingDate(data.pickupDate, data.pickupTime));
  const adminUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
  const escapedCustomerName = escapeHtml(data.customerName);
  const escapedCustomerEmail = escapeHtml(data.customerEmail);
  const escapedCustomerPhone = escapeHtml(data.customerPhone);
  const escapedPickupLocation = escapeHtml(data.pickupLocation);
  const escapedDropoffLocation = escapeHtml(data.dropoffLocation);
  const escapedFlightNumber = escapeHtml(data.flightNumber || '');
  const escapedTariffName = escapeHtml(data.tariffName || 'Standard');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background:#1e293b;border-radius:12px 12px 0 0;padding:20px 28px;display:flex;align-items:center;justify-content:space-between;">
              <table width="100%"><tr>
                <td>
                  <span style="font-size:20px;">🚕</span>
                  <strong style="color:#BF953F;font-size:16px;margin-left:8px;">${companyName}</strong>
                  <p style="margin:2px 0 0;color:#64748b;font-size:12px;">Admin Notification</p>
                </td>
                <td style="text-align:right;">
                  <span style="background:#BF953F22;color:#BF953F;border:1px solid #BF953F44;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;">NEW BOOKING</span>
                </td>
              </tr></table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#fff;padding:28px;">

              <h2 style="margin:0 0 4px;color:#0f172a;font-size:18px;">Trip #${tripRef}</h2>
              <p style="margin:0 0 24px;color:#64748b;font-size:13px;">${scheduledStr}</p>

              <!-- 2-col grid: Passenger + Route -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td style="width:48%;vertical-align:top;padding-right:8px;">
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                      <p style="margin:0 0 10px;font-size:10px;color:#BF953F;font-weight:700;text-transform:uppercase;letter-spacing:1px;">👤 Passenger</p>
                      <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#0f172a;">${escapedCustomerName}</p>
                      <p style="margin:0 0 3px;font-size:12px;color:#475569;">${escapedCustomerEmail}</p>
                      <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#0f172a;">${escapedCustomerPhone}</p>
                      ${data.passengers ? `<p style="margin:6px 0 0;font-size:12px;color:#64748b;">👥 ${data.passengers} passenger(s)</p>` : ''}
                      ${escapedFlightNumber ? `<p style="margin:4px 0 0;font-size:12px;font-weight:700;color:#0f172a;">✈️ ${escapedFlightNumber}</p>` : ''}
                    </div>
                  </td>
                  <td style="width:48%;vertical-align:top;padding-left:8px;">
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                      <p style="margin:0 0 10px;font-size:10px;color:#BF953F;font-weight:700;text-transform:uppercase;letter-spacing:1px;">📍 Route</p>
                      <p style="margin:0 0 2px;font-size:10px;color:#22c55e;font-weight:700;text-transform:uppercase;">FROM</p>
                      <p style="margin:0 0 10px;font-size:12px;color:#0f172a;">${escapedPickupLocation}</p>
                      <p style="margin:0 0 2px;font-size:10px;color:#f59e0b;font-weight:700;text-transform:uppercase;">TO</p>
                      <p style="margin:0;font-size:12px;color:#0f172a;">${escapedDropoffLocation}</p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Tariff + Price -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:10px;padding:16px 20px;margin-bottom:16px;">
                <tr>
                  <td>
                    <p style="margin:0;font-size:12px;color:#64748b;">Vehicle: <strong style="color:#e2e8f0;">${escapedTariffName}</strong></p>
                    <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Payment: <strong style="color:#e2e8f0;">${data.paymentMethod === 'CASH' ? '💵 Cash' : '💳 Card'}</strong> — <strong style="color:${data.paymentStatus === 'PAID' ? '#4ade80' : '#fbbf24'}">${data.paymentStatus || 'PENDING'}</strong></p>
                  </td>
                  <td style="text-align:right;">
                    <p style="margin:0;font-size:24px;font-weight:800;color:#BF953F;">${sym}${data.price}</p>
                  </td>
                </tr>
              </table>

              <!-- Extras -->
              ${extras.length > 0 ? `
              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
                <p style="margin:0 0 8px;font-size:10px;color:#92400e;font-weight:700;text-transform:uppercase;letter-spacing:1px;">⭐ Extras</p>
                ${extras.map(e => `<p style="margin:0 0 4px;font-size:13px;color:#0f172a;"><strong>${escapeHtml(e.label)}</strong> ${escapeHtml(e.detail)}</p>`).join('')}
              </div>` : ''}

              <!-- Notes -->
              ${cleanNotes ? `
              <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
                <p style="margin:0 0 6px;font-size:10px;color:#075985;font-weight:700;text-transform:uppercase;letter-spacing:1px;">📝 Notes for Driver</p>
                <p style="margin:0;font-size:13px;color:#0c4a6e;font-style:italic;">${cleanNotes}</p>
              </div>` : ''}

              <!-- Admin CTA -->
              ${adminUrl ? `
              <div style="text-align:center;padding-top:8px;">
                <a href="${adminUrl}/admin/trips" style="display:inline-block;background:#BF953F;color:#0f172a;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">
                  View in Admin Panel →
                </a>
              </div>` : ''}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#e2e8f0;border-radius:0 0 12px 12px;padding:14px 28px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:11px;">This is an automated message from ${companyName} admin system.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const sendBookingEmails = async (
  data: TripEmailData,
  adminEmail: string,
  companyName: string
): Promise<void> => {
  const promises: Promise<any>[] = [];

  // Email to customer (skip generic guest emails)
  if (data.customerEmail && !data.customerEmail.includes('guest@')) {
    promises.push(
      sendEmail({
        to: data.customerEmail,
        subject: `✅ Booking Confirmed #${data.tripNumber || data.id.slice(-6).toUpperCase()} — ${companyName}`,
        html: buildCustomerEmailHtml(data, companyName),
      })
    );
  }

  // Email to admin
  if (adminEmail) {
    promises.push(
      sendEmail({
        to: adminEmail,
        subject: `🚕 New Booking #${data.tripNumber || data.id.slice(-6).toUpperCase()} — ${data.customerName}`,
        html: buildAdminEmailHtml(data, companyName),
      })
    );
  }

  await Promise.allSettled(promises);
};
