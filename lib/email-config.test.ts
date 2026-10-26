import assert from 'node:assert/strict';
import test from 'node:test';
import { getEmailDeliveryStatus } from './email-config';

test('email delivery status is derived from key and sender presence', () => {
  assert.deepEqual(getEmailDeliveryStatus({}), { apiKeyConfigured: false, senderConfigured: false, state: 'not-configured' });
  assert.deepEqual(getEmailDeliveryStatus({ EMAIL_FROM: 'bookings@example.test' }), { apiKeyConfigured: false, senderConfigured: true, state: 'not-configured' });
  assert.deepEqual(getEmailDeliveryStatus({ RESEND_API_KEY: 're_key' }), { apiKeyConfigured: true, senderConfigured: false, state: 'test-sender' });
  assert.deepEqual(getEmailDeliveryStatus({ RESEND_API_KEY: 're_key', EMAIL_FROM: 'bookings@example.test' }), { apiKeyConfigured: true, senderConfigured: true, state: 'ready' });
});

test('blank values count as missing, and the status never contains secret values', () => {
  const status = getEmailDeliveryStatus({ RESEND_API_KEY: '  ', EMAIL_FROM: '' });
  assert.equal(status.state, 'not-configured');
  const configured = getEmailDeliveryStatus({ RESEND_API_KEY: 're_secret_key', EMAIL_FROM: 'secret-sender@example.test' });
  assert.doesNotMatch(JSON.stringify(configured), /re_secret_key|secret-sender/);
});
