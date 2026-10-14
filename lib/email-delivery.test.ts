import assert from 'node:assert/strict';
import test from 'node:test';
import * as zod from 'zod';
import * as templates from './email-templates';
import { emailTripFixture } from './test-support/email-fixture';
import { loadIsolated } from './test-support/load-isolated';

const response = { NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) } };

function emailProvider(fails = false, configured = true) {
  const deliveries: { payload: any; options: any }[] = [];
  const email = loadIsolated('lib/email.ts', {
    resend: { Resend: class {
      emails = { send: async (payload: any, options: any) => {
        deliveries.push({ payload, options });
        return fails ? { data: null, error: new Error('Mock delivery failure') } : { data: { id: 'mock-delivery' }, error: null };
      } };
    } },
    './email-templates': templates,
  }, { process: { env: { EMAIL_FROM: 'sender@example.test', ...(configured ? { RESEND_API_KEY: 're_mock_only' } : {}) } } });
  return { email, deliveries };
}

test('booking delivery preserves idempotency keys and sets working reply-to addresses for both recipients', async () => {
  const { email, deliveries } = emailProvider();
  const trip = emailTripFixture();
  assert.equal(await email.sendBookingEmails(trip, 'operator@example.test', 'Example Taxi'), true);
  assert.equal(deliveries.length, 2);
  assert.equal(deliveries[0].payload.to, trip.customerEmail);
  assert.equal(deliveries[0].payload.replyTo, trip.supportEmail);
  assert.equal(deliveries[0].payload.from, 'sender@example.test');
  assert.match(deliveries[0].payload.subject, /^Booking Received #TRP-2026-0042/);
  assert.equal(deliveries[0].options.idempotencyKey, `trip/${trip.id}/confirmation/customer`);
  assert.equal(deliveries[1].payload.to, 'operator@example.test');
  assert.equal(deliveries[1].payload.replyTo, trip.customerEmail);
  assert.equal(deliveries[1].options.idempotencyKey, `trip/${trip.id}/confirmation/admin`);
});

test('paid, confirmed bookings have a consistent confirmed subject and body', async () => {
  const { email, deliveries } = emailProvider();
  await email.sendBookingEmails(emailTripFixture({ status: 'CONFIRMED', paymentMethod: 'STRIPE', paymentStatus: 'PAID' }), 'operator@example.test', 'Taxi');
  assert.match(deliveries[0].payload.subject, /^Booking Confirmed/);
  assert.match(deliveries[0].payload.html, /Booking Confirmed/);
  assert.match(deliveries[0].payload.html, /Your payment has been received/);
});

test('real guest-named mailboxes receive emails, while known placeholders and blank addresses are skipped', async () => {
  for (const address of ['', 'guest@example.com', 'test@placeholder.com', 'guest@real.example']) {
    const { email, deliveries } = emailProvider();
    await email.sendBookingEmails(emailTripFixture({ customerEmail: address }), 'operator@example.test', 'Taxi');
    assert.equal(deliveries.length, address === 'guest@real.example' ? 2 : 1);
  }
});

test('delivery failure returns false, and optional mock mode never constructs/sends through the provider', async () => {
  const failing = emailProvider(true);
  assert.equal(await failing.email.sendBookingEmails(emailTripFixture(), 'operator@example.test', 'Taxi'), false);
  const unconfigured = emailProvider(false, false);
  await unconfigured.email.sendBookingEmails(emailTripFixture(), 'operator@example.test', 'Taxi');
  assert.equal(unconfigured.deliveries.length, 0);
});

test('paid booking outbox passes actual persisted status, payment, extras and discount into both email templates', async () => {
  const calls: any[] = [];
  const updates: any[] = [];
  const fixture = emailTripFixture();
  const trip = {
    id: fixture.id, tripNumber: fixture.tripNumber, status: 'CONFIRMED',
    passengerName: fixture.customerName, passengerEmail: fixture.customerEmail, passengerPhone: fixture.customerPhone,
    pickupAddress: fixture.pickupLocation, dropoffAddress: fixture.dropoffLocation,
    pickupDateTime: new Date(fixture.pickupDate), passengerCount: fixture.passengers,
    tariffPlan: { name: fixture.tariffName }, total: '75.50', currency: 'EUR',
    paymentMethod: 'STRIPE', paymentStatus: 'PARTIALLY_REFUNDED',
    extras: fixture.extras, notes: fixture.notes, discountAmount: '5', distance: 42.3, duration: 38,
  };
  const outbox = loadIsolated('lib/booking-email-outbox.ts', {
    './db': { db: {
      bookingEmailDelivery: {
        findUnique: async () => ({ id: 'delivery-preview', sentAt: null, trip }),
        updateMany: async ({ data }: any) => { updates.push(data); return { count: 1 }; },
      },
      storeSettings: { findFirst: async () => ({ companyName: 'Example Taxi', storeEmail: 'operator@example.test' }) },
    } },
    './email': { sendBookingEmails: async (...args: any[]) => { calls.push(args); return true; } },
  });
  assert.equal(await outbox.deliverBookingEmail(trip.id), 'sent');
  const [data, adminEmail, companyName] = calls[0];
  assert.equal(data.status, 'CONFIRMED');
  assert.equal(data.paymentStatus, 'PARTIALLY_REFUNDED');
  assert.equal(data.extras, fixture.extras);
  assert.equal(data.discountAmount, 5);
  assert.equal(data.distance, '42.3 km');
  assert.equal(data.duration, '38 min');
  assert.equal(adminEmail, 'operator@example.test');
  assert.equal(companyName, 'Example Taxi');
  assert.ok(updates.some(update => update.sentAt));
});

test('status-change route sends friendly labels, human booking reference and assigned driver name/phone', async () => {
  const deliveries: any[] = [];
  let trip = {
    id: 'trip-preview-000042', tripNumber: 'TRP-42', status: 'PENDING',
    passengerEmail: 'alex@example.test', paymentStatus: 'PENDING', paymentMethod: 'CASH',
    driverName: 'Legacy name', driverPhone: '+357 11111111',
    driver: { name: 'Assigned Driver', phone: '+357 00000000' },
  };
  const route = loadIsolated('app/api/trips/[id]/route.ts', {
    '@/lib/auth': { auth: async () => ({ user: { id: 'admin-test', role: 'ADMIN' } }) },
    '@/lib/db': { db: {
      trip: { findUnique: async () => trip, update: async ({ data, include }: any) => {
        assert.equal(include.driver, true);
        trip = { ...trip, ...data };
        return trip;
      } },
      storeSettings: { findFirst: async () => ({ companyName: 'Taxi', storeEmail: 'operator@example.test' }) },
    } },
    'next/server': response,
    '@/lib/email-templates': templates,
    '@/lib/email': { sendEmail: async (payload: any) => { deliveries.push(payload); return { id: 'test' }; } },
    zod,
  });
  const patch = (data: any) => route.PATCH({ json: async () => data }, { params: { id: trip.id } });
  assert.equal((await patch({ status: 'CONFIRMED' })).status, 200);
  assert.equal(deliveries.length, 1);
  assert.match(deliveries[0].subject, /Trip #TRP-42 — Confirmed/);
  assert.match(deliveries[0].html, /Assigned Driver/);
  assert.match(deliveries[0].html, /\+357 00000000/);
  assert.doesNotMatch(deliveries[0].html, /Legacy name|Tracking Info/);
  assert.equal(deliveries[0].replyTo, 'operator@example.test');
  await patch({ driverPhone: '+357 22222222' });
  await patch({ status: 'CONFIRMED' });
  assert.equal(deliveries.length, 1, 'driver-only edits or unchanged status must not send an extra status email');
});

test('contact route sets reply-to in both directions and confirms receipt only after admin delivery', async () => {
  const deliveries: any[] = [];
  let adminFails = false;
  const route = loadIsolated('app/api/contact/route.ts', {
    'next/server': response,
    '@/lib/email': { sendEmail: async (payload: any) => { deliveries.push(payload); return adminFails ? null : { id: 'test' }; } },
    '@/lib/email-templates': templates,
    zod,
    '@/lib/rate-limit': { checkRateLimit: async () => ({ success: true }) },
    '@/lib/db': { db: { storeSettings: { findFirst: async () => ({ companyName: 'Taxi', storeEmail: 'operator@example.test' }) } } },
  });
  const request = { headers: { get: () => null }, json: async () => ({ name: 'Alex Morgan', email: 'alex@example.test', subject: 'Pickup question', message: 'Please confirm our pickup point.' }) };
  assert.equal((await route.POST(request)).status, 200);
  assert.equal(deliveries.length, 2);
  assert.equal(deliveries[0].replyTo, 'alex@example.test');
  assert.equal(deliveries[1].replyTo, 'operator@example.test');
  assert.doesNotMatch(deliveries[1].html, /24 hours/);
  deliveries.length = 0;
  adminFails = true;
  assert.equal((await route.POST(request)).status, 502);
  assert.equal(deliveries.length, 1);
});

test('password reset uses configured company branding and matches the persisted one-hour token lifetime', async () => {
  const now = Date.now();
  let persisted: any;
  const emails: any[] = [];
  const route = loadIsolated('app/api/auth/forgot-password/route.ts', {
    'next/server': response,
    '@/lib/db': { db: {
      user: { findUnique: async () => ({ id: 'test-user' }), update: async ({ data }: any) => { persisted = data; } },
      storeSettings: { findFirst: async () => ({ companyName: 'Example Taxi', storeEmail: 'office@example.test' }) },
    } },
    zod,
    crypto: { __esModule: true, default: { randomBytes: () => ({ toString: () => 'test-token' }) } },
    '@/lib/email': { sendPasswordResetEmail: async (...args: any[]) => { emails.push(args); } },
    '@/lib/rate-limit': { checkRateLimit: async () => ({ success: true }) },
  }, { process: { env: { NEXT_PUBLIC_APP_URL: 'https://taxi.example.test' } } });
  const result = await route.POST({ headers: { get: () => null }, json: async () => ({ email: 'alex@example.test' }) });
  assert.equal(result.status, 200);
  assert.equal(persisted.resetToken, 'test-token');
  assert.ok(Math.abs(persisted.resetTokenExpiry.getTime() - now - 3_600_000) < 5_000);
  assert.equal(emails[0][1], 'https://taxi.example.test/reset-password?token=test-token');
  assert.equal(emails[0][2], 'Example Taxi');
  assert.equal(emails[0][3], 'office@example.test');
});
