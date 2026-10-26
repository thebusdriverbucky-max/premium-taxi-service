export const RESEND_TEST_SENDER = 'onboarding@resend.dev';
export const EMAIL_NOT_CONFIGURED_ERROR = 'Email delivery is not configured';

// not-configured: no API key, nothing is sent.
// test-sender: API key without EMAIL_FROM; Resend delivers test-sender mail only to the Resend account owner.
export type EmailDeliveryState = 'not-configured' | 'test-sender' | 'ready';

export type EmailDeliveryStatus = {
  apiKeyConfigured: boolean;
  senderConfigured: boolean;
  state: EmailDeliveryState;
};

// Presence only, never the values. Presence does not prove the key or sender domain is valid.
export function getEmailDeliveryStatus(env: Record<string, string | undefined> = process.env): EmailDeliveryStatus {
  const apiKeyConfigured = Boolean(env.RESEND_API_KEY?.trim());
  const senderConfigured = Boolean(env.EMAIL_FROM?.trim());
  const state = !apiKeyConfigured ? 'not-configured' : senderConfigured ? 'ready' : 'test-sender';
  return { apiKeyConfigured, senderConfigured, state };
}
