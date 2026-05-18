// lib/email-templates.ts
// Shared email templates for taxi-project

const goldGradient = 'linear-gradient(135deg,#92400e 0%,#BF953F 40%,#FCF6BA 60%,#B38728 80%,#7a5c1e 100%)';
const darkBg = '#0f172a';
const cardBg = '#1e293b';
const borderColor = '#334155';

function baseWrapper(bodyContent: string, storeName: string, tagline = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${darkBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${darkBg};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        
        <!-- Header -->
        <tr>
          <td style="background:${goldGradient};border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
            <div style="font-size:32px;margin-bottom:8px;">🚕</div>
            <h1 style="margin:0;color:${darkBg};font-size:22px;font-weight:800;">${storeName}</h1>
            ${tagline ? `<p style="margin:6px 0 0;color:#1e293b;font-size:13px;opacity:0.8;">${tagline}</p>` : ''}
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:${cardBg};padding:36px 40px;">
            ${bodyContent}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:${darkBg};border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;border-top:1px solid #1e293b;">
            <p style="margin:0;color:#334155;font-size:12px;">
              © ${new Date().getFullYear()} <strong style="color:#475569;">${storeName}</strong>. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function goldButton(href: string, text: string): string {
  return `<div style="text-align:center;margin-top:24px;">
    <a href="${href}" style="display:inline-block;background:${goldGradient};color:${darkBg};font-weight:700;font-size:14px;padding:13px 32px;border-radius:8px;text-decoration:none;">
      ${text}
    </a>
  </div>`;
}

interface OrderConfirmationData {
  orderNumber: string;
  orderId: string;
  total: number;
  subtotal?: number;
  tax?: number;
  shippingCost?: number;
  items: { name: string; qty: number; price: number }[];
  storeName: string;
  supportEmail: string;
  storeUrl: string;
  currencySymbol?: string;
}

export const getOrderConfirmationEmailHtml = (data: OrderConfirmationData): string => {
  const { orderNumber, orderId, total, items, storeName, supportEmail, storeUrl, currencySymbol = '€' } = data;
  const trackUrl = storeUrl ? `${storeUrl}/orders/${orderId}` : '#';

  const itemsHtml = items.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#0f172a' : '#1a2744'}">
      <td style="padding:10px 14px;font-size:13px;color:#e2e8f0;">${item.name}</td>
      <td style="padding:10px 14px;font-size:13px;text-align:center;color:#94a3b8;">${item.qty}</td>
      <td style="padding:10px 14px;font-size:13px;text-align:right;color:#f8fafc;">${currencySymbol}${item.price.toFixed(2)}</td>
    </tr>
  `).join('');

  const body = `
    <p style="margin:0 0 6px;color:#e2e8f0;font-size:17px;font-weight:600;">Booking Confirmed ✅</p>
    <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.6;">
      Thank you for your booking! Your order <strong style="color:#BF953F;">#${orderNumber}</strong> has been received and is being processed.
    </p>

    <!-- Items -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${borderColor};border-radius:10px;overflow:hidden;margin-bottom:20px;">
      <thead>
        <tr style="background:#0a0f1e;">
          <th style="padding:10px 14px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Service</th>
          <th style="padding:10px 14px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Qty</th>
          <th style="padding:10px 14px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
        <tr style="background:#BF953F15;">
          <td colspan="2" style="padding:12px 14px;font-size:14px;font-weight:700;color:#BF953F;text-align:right;">Total</td>
          <td style="padding:12px 14px;font-size:18px;font-weight:800;color:#BF953F;text-align:right;">${currencySymbol}${total.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <p style="margin:0;font-size:13px;color:#475569;text-align:center;">
      Questions? Contact us at <a href="mailto:${supportEmail}" style="color:#BF953F;text-decoration:none;">${supportEmail}</a>
    </p>

    ${goldButton(trackUrl, 'View Booking →')}
  `;

  return baseWrapper(body, storeName, 'Order Confirmation');
};

export const getOrderStatusUpdateEmailHtml = (
  orderId: string,
  status: string,
  storeName: string,
  trackingNumber?: string | null
): string => {
  const storeUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
  const orderUrl = storeUrl ? `${storeUrl}/trips/${orderId}` : '#';

  const statusColors: Record<string, { bg: string; color: string; emoji: string }> = {
    CONFIRMED: { bg: '#16a34a22', color: '#4ade80', emoji: '✅' },
    IN_PROGRESS: { bg: '#3b82f622', color: '#93c5fd', emoji: '🚕' },
    COMPLETED: { bg: '#BF953F22', color: '#BF953F', emoji: '🏁' },
    CANCELLED: { bg: '#ef444422', color: '#f87171', emoji: '❌' },
  };
  const s = statusColors[status] || { bg: '#ffffff11', color: '#e2e8f0', emoji: '📋' };

  const body = `
    <p style="margin:0 0 6px;color:#e2e8f0;font-size:17px;font-weight:600;">Trip Status Update</p>
    <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.6;">
      Your booking has been updated. Here's the latest status:
    </p>

    <div style="background:${s.bg};border:1px solid ${s.color}33;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
      <div style="font-size:28px;margin-bottom:8px;">${s.emoji}</div>
      <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1.5px;">New Status</p>
      <p style="margin:6px 0 0;font-size:20px;font-weight:800;color:${s.color};">${status}</p>
    </div>

    <div style="background:#0f172a;border:1px solid ${borderColor};border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;font-size:12px;color:#64748b;">Booking Reference</p>
      <p style="margin:4px 0 0;font-size:14px;font-weight:700;font-family:monospace;color:#f8fafc;">${orderId}</p>
    </div>

    ${trackingNumber ? `
    <div style="background:#BF953F11;border:1px solid #BF953F33;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;font-size:12px;color:#BF953F;">Driver / Tracking Info</p>
      <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#f8fafc;">${trackingNumber}</p>
    </div>` : ''}

    ${goldButton(orderUrl, 'View Trip Details →')}
  `;

  return baseWrapper(body, storeName, 'Trip Status Update');
};

export const getPasswordResetEmailHtml = (resetLink: string, storeName: string): string => {
  const body = `
    <p style="margin:0 0 6px;color:#e2e8f0;font-size:17px;font-weight:600;">Password Reset Request 🔐</p>
    <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.6;">
      You recently requested to reset your password. Click the button below — this link is valid for <strong style="color:#e2e8f0;">1 hour</strong>.
    </p>

    ${goldButton(resetLink, 'Reset My Password →')}

    <p style="margin:24px 0 0;font-size:12px;color:#475569;text-align:center;line-height:1.6;">
      If you did not request a password reset, you can safely ignore this email.<br>
      Your password will not be changed.
    </p>
    <p style="margin:12px 0 0;font-size:11px;color:#334155;text-align:center;word-break:break-all;">
      Or copy this link: <a href="${resetLink}" style="color:#BF953F;text-decoration:none;">${resetLink}</a>
    </p>
  `;

  return baseWrapper(body, storeName, 'Account Security');
};
