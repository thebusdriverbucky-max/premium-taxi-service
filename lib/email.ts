import { Resend } from 'resend';
import {
  buildAdminEmailHtml,
  buildCustomerEmailHtml,
  getBookingEmailTitle,
  getOrderConfirmationEmailHtml,
  getOrderStatusUpdateEmailHtml,
  getPasswordResetEmailHtml,
  getTripStatusLabel,
  type TripEmailData,
} from './email-templates';

// Preserve existing imports; rendering itself does not load the email provider.
export { buildAdminEmailHtml, buildCustomerEmailHtml } from './email-templates';
export type { TripEmailData } from './email-templates';

const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';
let resendClient: Resend | null = null;
let resendClientApiKey: string | null = null;

function getResendClient(apiKey: string): Resend {
  if (!resendClient || resendClientApiKey !== apiKey) {
    resendClient = new Resend(apiKey);
    resendClientApiKey = apiKey;
  }
  return resendClient;
}

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  idempotencyKey?: string;
};

export const sendEmail = async (data: EmailPayload) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('⚠️ RESEND_API_KEY not set. Logging email to console.');
    console.log('📧 [MOCK EMAIL] To:', data.to);
    console.log('Subject:', data.subject);
    console.log('HTML:', data.html);
    return { id: 'mock-id' };
  }
  try {
    const resend = getResendClient(apiKey);
    const { data: emailData, error } = await resend.emails.send(
      {
        from: EMAIL_FROM,
        to: data.to,
        subject: data.subject,
        html: data.html,
        ...(data.replyTo ? { replyTo: data.replyTo } : {}),
      },
      data.idempotencyKey ? { idempotencyKey: data.idempotencyKey } : undefined,
    );
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

// Compatibility wrappers; current booking routes use sendBookingEmails().
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
    items: { name: string; qty: number; price: number }[];
  },
) => {
  const storeName = orderData.storeName || 'Taxi Service';
  const supportEmail = process.env.ADMIN_EMAIL || '';
  return sendEmail({
    to: userEmail,
    subject: `Booking Received #${orderData.orderNumber}`,
    html: getOrderConfirmationEmailHtml({
      ...orderData, storeName, supportEmail,
      storeUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || '',
    }),
    replyTo: supportEmail || undefined,
  });
};

export const sendOrderStatusUpdateEmail = async (
  userEmail: string,
  tripId: string,
  status: string,
  driverName?: string | null,
) => sendEmail({
  to: userEmail,
  subject: `Trip Status Update #${tripId.slice(-6).toUpperCase()} — ${getTripStatusLabel(status)}`,
  html: getOrderStatusUpdateEmailHtml(tripId, status, 'Taxi Service', driverName),
});

export const sendPasswordResetEmail = async (
  userEmail: string,
  resetLink: string,
  companyName = 'Taxi Service',
  supportEmail?: string,
) => sendEmail({
  to: userEmail,
  subject: `Reset Your Password — ${companyName}`,
  html: getPasswordResetEmailHtml(resetLink, companyName),
  replyTo: supportEmail || undefined,
});

export const sendBookingEmails = async (
  data: TripEmailData,
  adminEmail: string,
  companyName: string,
): Promise<boolean> => {
  const promises: Promise<unknown | null>[] = [];
  const templateData = { ...data, supportEmail: data.supportEmail || adminEmail };
  // Skip only known placeholders, not real addresses containing "guest".
  const hasCustomerEmail = data.customerEmail && data.customerEmail !== 'guest@example.com' && !data.customerEmail.endsWith('@placeholder.com');
  if (hasCustomerEmail) {
    promises.push(sendEmail({
      to: data.customerEmail,
      subject: `${getBookingEmailTitle(data.status)} #${data.tripNumber || data.id.slice(-6).toUpperCase()} — ${companyName}`,
      html: buildCustomerEmailHtml(templateData, companyName),
      replyTo: templateData.supportEmail || undefined,
      idempotencyKey: `trip/${data.id}/confirmation/customer`,
    }));
  }
  if (adminEmail) {
    promises.push(sendEmail({
      to: adminEmail,
      subject: `🚕 New Booking #${data.tripNumber || data.id.slice(-6).toUpperCase()} — ${data.customerName}`,
      html: buildAdminEmailHtml(templateData, companyName),
      replyTo: hasCustomerEmail ? data.customerEmail : undefined,
      idempotencyKey: `trip/${data.id}/confirmation/admin`,
    }));
  }
  const results = await Promise.allSettled(promises);
  return results.every(result => result.status === 'fulfilled' && result.value !== null);
};
