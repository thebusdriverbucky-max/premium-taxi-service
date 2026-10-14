// Shared, email-client-safe layout for every transactional email.
// Solid background colours also work in clients that ignore gradients.
export const emailTheme = {
  background: '#0B1019',
  body: '#141D2B',
  card: '#0F1724',
  border: '#2C3747',
  gold: '#D4AF37',
  goldHighlight: '#E5BC4B',
  goldGradient: 'linear-gradient(120deg,#B8860B 0%,#D4AF37 48%,#E5BC4B 100%)',
  text: '#F1F5F9',
  muted: '#B4BFCE',
  label: '#93A1B3',
} as const;

export function escapeEmailHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] as string);
}

function safeWebUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function getEmailAppUrl(path: string): string | null {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || '';
  const safeBase = safeWebUrl(base);
  return safeBase ? new URL(path, new URL(safeBase).origin).href : null;
}

function emailLink(email?: string | null): string | null {
  const address = email?.trim();
  return address && /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(address) ? `mailto:${encodeURIComponent(address)}` : null;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 18px;color:${emailTheme.muted};font-size:14px;line-height:1.7;">${text}</p>`;
}

function heading(text: string): string {
  return `<h2 style="margin:0 0 12px;color:${emailTheme.text};font-size:22px;line-height:1.4;">${escapeEmailHtml(text)}</h2>`;
}

function section(title: string, content: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${emailTheme.card}" style="background-color:${emailTheme.card};border:1px solid ${emailTheme.border};border-radius:12px;margin:0 0 20px;">
    <tr><td style="padding:18px 20px;">
      <p style="margin:0 0 12px;color:${emailTheme.goldHighlight};font-size:11px;line-height:1.5;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;">${escapeEmailHtml(title)}</p>
      ${content}
    </td></tr>
  </table>`;
}

function detailRow(label: string, value: unknown): string {
  return `<tr>
    <td width="38%" style="padding:7px 12px 7px 0;color:${emailTheme.label};font-size:13px;line-height:1.6;vertical-align:top;">${escapeEmailHtml(label)}</td>
    <td style="padding:7px 0;color:${emailTheme.text};font-size:13px;line-height:1.6;vertical-align:top;word-break:break-word;">${escapeEmailHtml(value)}</td>
  </tr>`;
}

function detailTable(rows: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

function goldButton(href: string | null, text: string): string {
  if (!href) return '';
  // mailto links are built exclusively by emailLink(), never taken from raw input.
  const safeHref = href.startsWith('mailto:') ? href : safeWebUrl(href);
  if (!safeHref) return '';
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:24px auto 8px;">
    <tr><td align="center" bgcolor="${emailTheme.gold}" style="background-color:${emailTheme.gold};background-image:${emailTheme.goldGradient};border-radius:8px;">
      <a href="${escapeEmailHtml(safeHref)}" style="display:inline-block;padding:14px 28px;border:1px solid ${emailTheme.gold};border-radius:8px;color:${emailTheme.background};font-size:14px;line-height:1.4;font-weight:700;text-decoration:none;">${escapeEmailHtml(text)}</a>
    </td></tr>
  </table>`;
}

function baseWrapper(bodyContent: string, companyName: string, tagline: string, preheader: string): string {
  const safeCompany = escapeEmailHtml(companyName);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${escapeEmailHtml(tagline)} — ${safeCompany}</title>
  <style>@media only screen and (max-width:620px){.email-content{padding:24px 20px!important}.email-header{padding:28px 20px!important}}</style>
</head>
<body style="margin:0;padding:0;background-color:${emailTheme.background};font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeEmailHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${emailTheme.background}" style="background-color:${emailTheme.background};">
    <tr><td align="center" style="padding:28px 12px;">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr><td class="email-header" align="center" bgcolor="${emailTheme.gold}" style="background-color:${emailTheme.gold};background-image:${emailTheme.goldGradient};border-radius:16px 16px 0 0;padding:32px 28px;">
          <p style="margin:0 0 10px;font-size:30px;line-height:1.2;">🚕</p>
          <h1 style="margin:0;color:${emailTheme.background};font-size:24px;line-height:1.3;font-weight:800;word-break:break-word;">${safeCompany}</h1>
          <p style="margin:8px 0 0;color:${emailTheme.background};font-size:13px;line-height:1.5;">${escapeEmailHtml(tagline)}</p>
        </td></tr>
        <tr><td class="email-content" bgcolor="${emailTheme.body}" style="background-color:${emailTheme.body};padding:30px 28px;">${bodyContent}</td></tr>
        <tr><td align="center" bgcolor="${emailTheme.card}" style="background-color:${emailTheme.card};border-top:1px solid ${emailTheme.border};border-radius:0 0 16px 16px;padding:20px 24px;">
          <p style="margin:0;color:${emailTheme.label};font-size:12px;line-height:1.6;">© ${new Date().getFullYear()} ${safeCompany}. All rights reserved.</p>
          <p style="margin:5px 0 0;color:${emailTheme.label};font-size:11px;line-height:1.6;">This is an automated notification.</p>
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`;
}

export interface TripEmailData {
  id: string;
  tripNumber?: string;
  status?: string;
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
  // Accept persisted Prisma JSON, then validate its shape before rendering.
  extras?: unknown;
  discountAmount?: number;
  supportEmail?: string;
  distance?: string;
  duration?: string;
}

const tripStatuses: Record<string, { label: string; description: string; colour: string }> = {
  PENDING: { label: 'Awaiting confirmation', description: 'Your booking is awaiting confirmation.', colour: emailTheme.goldHighlight },
  CONFIRMED: { label: 'Confirmed', description: 'Your booking has been confirmed. Your driver will contact you to confirm the pickup details.', colour: '#86EFAC' },
  IN_PROGRESS: { label: 'In progress', description: 'Your trip is now in progress.', colour: '#93C5FD' },
  COMPLETED: { label: 'Completed', description: 'Your trip is complete. Thank you for travelling with us!', colour: emailTheme.goldHighlight },
  CANCELLED: { label: 'Cancelled', description: 'Your booking has been cancelled. This status update does not confirm a refund. Please contact us if you have a payment question.', colour: '#FCA5A5' },
  REFUNDED: { label: 'Refunded', description: 'Your booking has been marked as refunded. Please contact us for payment details.', colour: '#C4B5FD' },
};

export function getTripStatusLabel(status: string): string {
  return tripStatuses[status]?.label || 'Status updated';
}

export function getBookingEmailTitle(status?: string): string {
  if (!status || status === 'PENDING') return 'Booking Received';
  return status === 'CONFIRMED' ? 'Booking Confirmed' : 'Booking Details';
}

function bookingReference(data: Pick<TripEmailData, 'id' | 'tripNumber'>): string {
  return data.tripNumber || data.id.slice(-6).toUpperCase();
}

function formatMoney(amount: number, currency = 'EUR'): string {
  if (!Number.isFinite(amount)) return 'Amount unavailable';
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function formatBookingDate(date: Date | string, time?: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Schedule unavailable';
  // Keep the existing server-side convention, but expose its zone instead of
  // silently presenting Vercel's UTC time as pickup-local time.
  const zone = Intl.DateTimeFormat('en-GB', { timeZoneName: 'short' })
    .formatToParts(parsed).find(part => part.type === 'timeZoneName')?.value || 'UTC';
  const dateLabel = parsed.toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
  const timeLabel = time || parsed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${dateLabel} at ${timeLabel} (${zone})`;
}

function parseExtras(extras: unknown, notes?: string): { label: string; detail: string }[] {
  if (extras && typeof extras === 'object' && !Array.isArray(extras)) {
    const value = extras as Record<string, unknown>;
    const rows: { label: string; detail: string }[] = [];
    for (const [key, label] of [['luggage', 'Extra luggage'], ['childSeats', 'Child seat']]) {
      const entry = value[key];
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const { quantity, size } = entry as Record<string, unknown>;
      if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) continue;
      rows.push({ label, detail: `${quantity} ×${key === 'luggage' && typeof size === 'string' ? ` ${size}` : ''}` });
    }
    return rows;
  }
  // Older bookings used notes. Never merge these with the current JSON data.
  const match = notes?.match(/\[EXTRAS:\s*([^\]]+)\]/);
  return match ? match[1].split(',').flatMap(extra => {
    const [key, quantity = '1', size = 'Standard'] = extra.trim().split(':');
    if (!/^\d+$/.test(quantity) || Number(quantity) < 1) return [];
    if (key === 'ADD_LUGGAGE') return [{ label: 'Extra luggage', detail: `${quantity} × ${size}` }];
    if (key === 'CHILD_SEAT') return [{ label: 'Child seat', detail: `${quantity} ×` }];
    return [];
  }) : [];
}

function cleanNotes(notes?: string): string {
  return (notes || '').replace(/\[EXTRAS:[^\]]*\]\s*/g, '').replace(/^Notes for driver:\s*/i, '').trim();
}

function routeSection(data: TripEmailData): string {
  return section('Your route', detailTable(detailRow('Pickup', data.pickupLocation) + detailRow('Drop-off', data.dropoffLocation)));
}

function tripDetailsSection(data: TripEmailData): string {
  return section('Trip details', detailTable(
    detailRow('Scheduled pickup', formatBookingDate(data.pickupDate, data.pickupTime))
    + detailRow('Vehicle class', data.tariffName || 'Standard')
    + detailRow('Passengers', data.passengers ?? 1)
    + (data.flightNumber ? detailRow('Flight number', data.flightNumber) : '')
    + (data.distance ? detailRow('Estimated distance', data.distance) : '')
    + (data.duration ? detailRow('Estimated travel time', data.duration) : ''),
  ));
}

function extrasAndNotes(data: TripEmailData): string {
  const extras = parseExtras(data.extras, data.notes);
  const notes = cleanNotes(data.notes);
  return (extras.length ? section('Additional services', detailTable(extras.map(extra => detailRow(extra.label, extra.detail)).join(''))) : '')
    + (notes ? section('Notes for the driver', `<p style="margin:0;color:${emailTheme.text};font-size:14px;line-height:1.7;word-break:break-word;">${escapeEmailHtml(notes).replace(/\r?\n/g, '<br>')}</p>`) : '');
}

function paymentLabel(status?: string, method?: string): string {
  const labels: Record<string, string> = {
    UNPAID: 'Unpaid', PENDING: method === 'CASH' ? 'Due to driver' : 'Payment pending',
    PAID: 'Paid', FAILED: 'Payment failed', REFUNDED: 'Refunded', PARTIALLY_REFUNDED: 'Partially refunded',
  };
  return labels[status || ''] || 'Payment status unavailable';
}

function priceSection(data: TripEmailData): string {
  const method = data.paymentMethod === 'CASH' ? 'Cash to driver'
    : ['STRIPE', 'CARD'].includes(data.paymentMethod || '') ? 'Card' : 'Not specified';
  const paymentColour = data.paymentStatus === 'PAID' ? '#86EFAC' : emailTheme.goldHighlight;
  const paymentNote = data.paymentMethod === 'CASH' && ['PENDING', 'UNPAID'].includes(data.paymentStatus || '')
    ? 'Please pay the driver in cash for your trip.'
    : data.paymentStatus === 'PAID' ? 'Your payment has been received.' : '';
  return section('Total amount', `
    <p style="margin:0 0 14px;color:${emailTheme.goldHighlight};font-size:32px;line-height:1.3;font-weight:800;">${escapeEmailHtml(formatMoney(data.price, data.currency))}</p>
    ${detailTable(detailRow('Payment method', method))}
    <p style="margin:8px 0 0;color:${emailTheme.label};font-size:13px;line-height:1.6;">Payment status: <strong style="color:${paymentColour};">${escapeEmailHtml(paymentLabel(data.paymentStatus, data.paymentMethod))}</strong></p>
    ${data.discountAmount && data.discountAmount > 0 ? `<p style="margin:8px 0 0;color:${emailTheme.muted};font-size:12px;line-height:1.6;">Includes a discount of ${escapeEmailHtml(formatMoney(data.discountAmount, data.currency))}.</p>` : ''}
    ${paymentNote ? `<p style="margin:10px 0 0;color:${emailTheme.muted};font-size:13px;line-height:1.6;">${paymentNote}</p>` : ''}
  `);
}

function supportText(supportEmail?: string): string {
  const href = emailLink(supportEmail);
  if (href) return paragraph(`Questions or changes? Contact us at <a href="${escapeEmailHtml(href)}" style="color:${emailTheme.goldHighlight};text-decoration:underline;">${escapeEmailHtml(supportEmail?.trim())}</a>.`);
  const contactUrl = getEmailAppUrl('/contact');
  return paragraph(contactUrl
    ? `Questions or changes? <a href="${escapeEmailHtml(contactUrl)}" style="color:${emailTheme.goldHighlight};text-decoration:underline;">Contact us through our website</a>.`
    : 'For questions or changes, please use the contact details on our website.');
}

export const buildCustomerEmailHtml = (data: TripEmailData, companyName: string): string => {
  const reference = bookingReference(data);
  const status = data.status || 'PENDING';
  const tripUrl = getEmailAppUrl(`/trips/${encodeURIComponent(data.id)}`);
  const driverNote = ['PENDING', 'CONFIRMED'].includes(status) ? ' Your driver will contact you to confirm the pickup details.' : '';
  const body = heading(`Hi ${data.customerName}`)
    + paragraph(`Thank you for booking with ${escapeEmailHtml(companyName)}. We have received your booking <strong style="color:${emailTheme.goldHighlight};">#${escapeEmailHtml(reference)}</strong>.${driverNote}`)
    + section('Booking', detailTable(detailRow('Reference', reference) + detailRow('Booking status', getTripStatusLabel(status))))
    + routeSection(data) + tripDetailsSection(data) + extrasAndNotes(data) + priceSection(data)
    + supportText(data.supportEmail) + goldButton(tripUrl, 'View Booking')
    + (tripUrl ? paragraph('Full booking details may require you to sign in.') : '');
  return baseWrapper(body, companyName, getBookingEmailTitle(data.status), `Booking #${reference} — ${getTripStatusLabel(status)}. ${formatMoney(data.price, data.currency)}.`);
};

export const buildAdminEmailHtml = (data: TripEmailData, companyName = 'Taxi Service'): string => {
  const reference = bookingReference(data);
  const body = heading(`New booking #${reference}`)
    + paragraph('A booking has been received. Review the trip details and manage the booking in your admin panel.')
    + section('Booking', detailTable(detailRow('Reference', reference) + detailRow('Booking status', getTripStatusLabel(data.status || 'PENDING'))))
    + section('Passenger', detailTable(detailRow('Name', data.customerName) + detailRow('Email', data.customerEmail || 'Not provided') + detailRow('Phone', data.customerPhone || 'Not provided')))
    + routeSection(data) + tripDetailsSection(data) + extrasAndNotes(data) + priceSection(data)
    + goldButton(getEmailAppUrl('/admin/trips'), 'Manage Bookings');
  return baseWrapper(body, companyName, 'Admin Notification', `New booking #${reference} — ${data.customerName}. ${formatMoney(data.price, data.currency)}.`);
};

export interface TripStatusEmailContext {
  tripNumber?: string | null;
  driverPhone?: string | null;
  supportEmail?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
}

export const getOrderStatusUpdateEmailHtml = (
  tripId: string,
  status: string,
  companyName: string,
  driverName?: string | null,
  context: TripStatusEmailContext = {},
): string => {
  const presentation = tripStatuses[status] || { label: 'Status updated', description: 'Your booking has been updated. Please view your booking for the latest details.', colour: emailTheme.goldHighlight };
  const reference = context.tripNumber || tripId.slice(-6).toUpperCase();
  const description = status === 'REFUNDED' && context.paymentStatus === 'REFUNDED'
    ? 'A refund has been recorded for your booking. Please contact us if you have questions about your payment.'
    : presentation.description;
  const showDriver = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(status) && (driverName || context.driverPhone);
  const body = heading('Trip Status Update') + paragraph(escapeEmailHtml(description))
    + section('Your booking', `
      <p style="margin:0 0 12px;color:${presentation.colour};font-size:22px;line-height:1.4;font-weight:700;">${escapeEmailHtml(presentation.label)}</p>
      ${detailTable(detailRow('Booking reference', reference) + (context.paymentStatus ? detailRow('Payment status', paymentLabel(context.paymentStatus, context.paymentMethod || undefined)) : ''))}
    `)
    + (showDriver ? section('Your driver', detailTable((driverName ? detailRow('Name', driverName) : '') + (context.driverPhone ? detailRow('Phone', context.driverPhone) : ''))) : '')
    + supportText(context.supportEmail || undefined)
    + goldButton(getEmailAppUrl(`/trips/${encodeURIComponent(tripId)}`), 'View Trip Details');
  return baseWrapper(body, companyName, 'Trip Status Update', `Booking #${reference} — ${presentation.label}.`);
};

export const getPasswordResetEmailHtml = (resetLink: string, companyName: string): string => {
  const safeLink = safeWebUrl(resetLink);
  const body = heading('Reset your password')
    + paragraph('We received a request to reset the password for your account. Use the button below to choose a new password. This link is valid for <strong style="color:#F1F5F9;">1 hour</strong>.')
    + goldButton(safeLink, 'Reset Password')
    + paragraph('If you did not request this, you can safely ignore this email. Your password will stay unchanged unless you complete the reset.')
    + (safeLink ? `<p style="margin:20px 0 0;color:${emailTheme.label};font-size:12px;line-height:1.7;word-break:break-all;">If the button does not work, copy this link into your browser:<br><a href="${escapeEmailHtml(safeLink)}" style="color:${emailTheme.goldHighlight};">${escapeEmailHtml(safeLink)}</a></p>` : paragraph('A secure reset link is unavailable. Please request a new password reset from our website.'));
  return baseWrapper(body, companyName, 'Account Security', 'Reset your password. The link expires in 1 hour.');
};

export function getAdminContactEmailHtml(name: string, email: string, subject: string, message: string, companyName: string): string {
  const mailto = emailLink(email);
  const replyHref = mailto ? `${mailto}?subject=${encodeURIComponent(`Re: ${subject}`)}` : null;
  const body = heading('New contact message')
    + section('Sender', detailTable(detailRow('Name', name) + detailRow('Email', email)))
    + section('Subject', paragraph(escapeEmailHtml(subject)))
    + section('Message', `<p style="margin:0;color:${emailTheme.text};font-size:14px;line-height:1.7;word-break:break-word;">${escapeEmailHtml(message).replace(/\r?\n/g, '<br>')}</p>`)
    + goldButton(replyHref, `Reply to ${name}`);
  return baseWrapper(body, companyName, 'Contact Form Submission', `New message from ${name}: ${subject}`);
}

export function getCustomerContactEmailHtml(name: string, subject: string, supportEmail: string, companyName: string): string {
  const body = heading(`Hi ${name}`)
    + paragraph('Thank you for getting in touch. We have received your message. Our team will get back to you as soon as possible.')
    + section('Your subject', paragraph(escapeEmailHtml(subject))) + supportText(supportEmail);
  return baseWrapper(body, companyName, 'Message Received', `We have received your message: ${subject}`);
}

// Compatibility helper for older integrations; current bookings use TripEmailData.
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
  const symbol = data.currencySymbol || '€';
  const url = safeWebUrl(data.storeUrl);
  const tripUrl = url ? new URL(`/trips/${encodeURIComponent(data.orderId)}`, new URL(url).origin).href : null;
  const body = heading('Booking Received')
    + paragraph(`Thank you for your booking. We have received booking <strong style="color:${emailTheme.goldHighlight};">#${escapeEmailHtml(data.orderNumber)}</strong>.`)
    + section('Services', detailTable(data.items.map(item => detailRow(`${item.name} × ${item.qty}`, `${symbol}${item.price.toFixed(2)}`)).join('') + detailRow('Total', `${symbol}${data.total.toFixed(2)}`)))
    + supportText(data.supportEmail) + goldButton(tripUrl, 'View Booking');
  return baseWrapper(body, data.storeName, 'Booking Received', `Booking #${data.orderNumber} has been received.`);
};
