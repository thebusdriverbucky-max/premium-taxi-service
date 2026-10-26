import assert from 'node:assert/strict';
import test from 'node:test';
import * as zod from 'zod';
import { createHash } from 'node:crypto';
import * as templates from './email-templates';
import * as emailConfig from './email-config';
import { emailTripFixture } from './test-support/email-fixture';
import { loadIsolated } from './test-support/load-isolated';

// Objects built inside the isolated VM come from another realm, so compare plain JSON copies.
const plain = (value: unknown) => JSON.parse(JSON.stringify(value));
const response = { NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) } };

function emailProvider(fails = false, configured = true, env: Record<string, string> = {}, logger: Record<string, (...args: any[]) => void> = {}) {
  const deliveries: { payload: any; options: any }[] = [];
  const email = loadIsolated('lib/email.ts', {
    resend: { Resend: class {
      emails = { send: async (payload: any, options: any) => {
        deliveries.push({ payload, options });
        return fails ? { data: null, error: new Error('Mock delivery failure') } : { data: { id: 'mock-delivery' }, error: null };
      } };
    } },
    './email-templates': templates,
    './email-config': emailConfig,
  }, {
    process: { env: { EMAIL_FROM: 'sender@example.test', ...(configured ? { RESEND_API_KEY: 're_mock_only' } : {}), ...env } },
    console: { log() {}, error() {}, warn() {}, ...logger },
  });
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

test('delivery failure returns false and an unconfigured provider is never reported as delivered', async () => {
  const failing = emailProvider(true);
  assert.equal(await failing.email.sendBookingEmails(emailTripFixture(), 'operator@example.test', 'Taxi'), false);
  const unconfigured = emailProvider(false, false);
  assert.equal(await unconfigured.email.sendBookingEmails(emailTripFixture(), 'operator@example.test', 'Taxi'), false);
  assert.equal(unconfigured.deliveries.length, 0);
});

test('sendEmail reports sent, failed and not-configured distinctly', async () => {
  const message = { to: 'alex@example.test', subject: 'Hello', html: '<p>Hi</p>' };
  assert.deepEqual(plain(await emailProvider().email.sendEmail(message)), { status: 'sent', id: 'mock-delivery' });
  assert.deepEqual(plain(await emailProvider(true).email.sendEmail(message)), { status: 'failed' });
  assert.deepEqual(plain(await emailProvider(false, false).email.sendEmail(message)), { status: 'not-configured' });
  assert.deepEqual(plain(await emailProvider(false, true, { RESEND_API_KEY: '   ' }).email.sendEmail(message)), { status: 'not-configured' });
});

test('sendEmail without an API key warns once in production without leaking the body or links', async () => {
  const production = { logs: [] as any[][], warnings: [] as any[][] };
  const message = { to: 'alex@example.test', subject: 'Reset', html: '<a href="https://taxi.example.test/reset-password?token=secret">link</a>' };
  const prod = emailProvider(false, false, { NODE_ENV: 'production' }, {
    log: (...args) => production.logs.push(args),
    warn: (...args) => production.warnings.push(args),
  });
  assert.equal((await prod.email.sendEmail(message)).status, 'not-configured');
  assert.equal(production.warnings.length, 1);
  assert.equal(production.logs.length, 0);
  assert.doesNotMatch(JSON.stringify(production), /secret|reset-password|alex@example\.test/);

  const development = { logs: [] as any[][], warnings: [] as any[][] };
  const dev = emailProvider(false, false, { NODE_ENV: 'development' }, {
    log: (...args) => development.logs.push(args),
    warn: (...args) => development.warnings.push(args),
  });
  await dev.email.sendEmail(message);
  assert.equal(development.warnings.length, 0);
  assert.match(JSON.stringify(development.logs), /MOCK EMAIL/);
  assert.match(JSON.stringify(development.logs), /token=secret/);
});

test('without EMAIL_FROM the Resend test sender is used, and a configured sender wins', async () => {
  const testSender = emailProvider(false, true, { EMAIL_FROM: '' });
  await testSender.email.sendEmail({ to: 'a@example.test', subject: 'Hi', html: '<p>Hi</p>' });
  assert.equal(testSender.deliveries[0].payload.from, 'onboarding@resend.dev');
  const configured = emailProvider();
  await configured.email.sendEmail({ to: 'a@example.test', subject: 'Hi', html: '<p>Hi</p>' });
  assert.equal(configured.deliveries[0].payload.from, 'sender@example.test');
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
    './email-config': emailConfig,
  }, { process: { env: { RESEND_API_KEY: 're_mock_only', EMAIL_FROM: 'sender@example.test' } } });
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

function outboxHarness(env: Record<string, string>, rows: any[] = []) {
  const updates: { where: any; data: any }[] = [];
  const queries: any[] = [];
  const sends: any[][] = [];
  const outbox = loadIsolated('lib/booking-email-outbox.ts', {
    './db': { db: {
      bookingEmailDelivery: {
        findUnique: async ({ where }: any) => rows.find(row => row.tripId === where.tripId) ?? null,
        findMany: async (query: any) => { queries.push(query); return rows.map(row => ({ tripId: row.tripId })); },
        updateMany: async (update: any) => { updates.push(update); return { count: 1 }; },
      },
      storeSettings: { findFirst: async () => ({ companyName: 'Example Taxi', storeEmail: 'operator@example.test' }) },
    } },
    './email': { sendBookingEmails: async (...args: any[]) => { sends.push(args); return true; } },
    './email-config': emailConfig,
  }, { process: { env } });
  return { outbox, updates, queries, sends };
}

function pendingRow(tripId: string) {
  const fixture = emailTripFixture();
  return {
    id: `delivery-${tripId}`, tripId, sentAt: null,
    trip: {
      id: tripId, status: 'CONFIRMED', passengerName: fixture.customerName, passengerEmail: fixture.customerEmail,
      pickupAddress: fixture.pickupLocation, dropoffAddress: fixture.dropoffLocation, pickupDateTime: new Date(Date.now() + 86_400_000),
      total: '10', currency: 'EUR', paymentMethod: 'STRIPE', paymentStatus: 'PAID', tariffPlan: null,
    },
  };
}

test('outbox records a configuration error without marking the booking email sent when email is not configured', async () => {
  const { outbox, updates, sends } = outboxHarness({}, [pendingRow('trip-1')]);
  assert.equal(await outbox.deliverBookingEmail('trip-1'), 'not-configured');
  assert.equal(sends.length, 0);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].data.lastError, 'Email delivery is not configured');
  assert.equal('sentAt' in updates[0].data, false);
  assert.deepEqual(plain(updates[0].where), { id: 'delivery-trip-1', sentAt: null });
});

test('pending outbox run skips unconfigured rows without counting failures and only queries relevant rows', async () => {
  const before = Date.now();
  const { outbox, updates, queries } = outboxHarness({}, [pendingRow('trip-1'), pendingRow('trip-2')]);
  assert.deepEqual(plain(await outbox.deliverPendingBookingEmails(10)), { checked: 2, sent: 0, alreadySent: 0, skipped: 2, failed: 0 });
  assert.equal(updates.every(update => !('sentAt' in update.data)), true);
  const { where, take } = queries[0];
  assert.equal(take, 10);
  assert.equal(where.sentAt, null);
  const [recent, upcoming] = where.OR;
  const windowStart = recent.createdAt.gte.getTime();
  assert.ok(Math.abs(before - windowStart - 48 * 3_600_000) < 5_000, 'recently created rows are retried for 48 hours');
  assert.ok(Math.abs(upcoming.trip.pickupDateTime.gt.getTime() - before) < 5_000, 'rides still ahead stay relevant');
});

test('pending outbox run delivers relevant rows once email is configured', async () => {
  const { outbox, updates, sends } = outboxHarness({ RESEND_API_KEY: 're_mock_only', EMAIL_FROM: 'sender@example.test' }, [pendingRow('trip-1')]);
  assert.deepEqual(plain(await outbox.deliverPendingBookingEmails()), { checked: 1, sent: 1, alreadySent: 0, skipped: 0, failed: 0 });
  assert.equal(sends.length, 1);
  assert.ok(updates.some(update => update.data.sentAt));
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

function contactRoute(env: Record<string, string>, deliveries: any[], settings: any = { companyName: 'Taxi', storeEmail: 'operator@example.test', phoneNumber: '+357 11111111' }, adminFails = () => false) {
  return loadIsolated('app/api/contact/route.ts', {
    'next/server': response,
    '@/lib/email': { sendEmail: async (payload: any) => { deliveries.push(payload); return adminFails() ? { status: 'failed' } : { status: 'sent', id: 'test' }; } },
    '@/lib/email-config': emailConfig,
    '@/lib/email-templates': templates,
    zod,
    '@/lib/rate-limit': { checkRateLimit: async () => ({ success: true }) },
    '@/lib/db': { db: { storeSettings: { findFirst: async () => settings } } },
  }, { process: { env } });
}

const contactRequest = { headers: { get: () => null }, json: async () => ({ name: 'Alex Morgan', email: 'alex@example.test', subject: 'Pickup question', message: 'Please confirm our pickup point.' }) };
const configuredEnv = { RESEND_API_KEY: 're_mock_only', EMAIL_FROM: 'sender@example.test' };

test('contact route sets reply-to in both directions and confirms receipt only after admin delivery', async () => {
  const deliveries: any[] = [];
  let adminFails = false;
  const route = contactRoute(configuredEnv, deliveries, undefined, () => adminFails);
  assert.equal((await route.POST(contactRequest)).status, 200);
  assert.equal(deliveries.length, 2);
  assert.equal(deliveries[0].replyTo, 'alex@example.test');
  assert.equal(deliveries[1].replyTo, 'operator@example.test');
  assert.doesNotMatch(deliveries[1].html, /24 hours/);
  deliveries.length = 0;
  adminFails = true;
  assert.equal((await route.POST(contactRequest)).status, 502);
  assert.equal(deliveries.length, 1);
});

test('contact route answers 503 with company contact details instead of pretending delivery when email is not configured', async () => {
  const deliveries: any[] = [];
  const route = contactRoute({ ADMIN_EMAIL: 'private@example.test' }, deliveries);
  const result = await route.POST(contactRequest);
  assert.equal(result.status, 503);
  assert.equal(result.body.code, 'EMAIL_NOT_CONFIGURED');
  assert.match(result.body.error, /temporarily unavailable/);
  assert.deepEqual(plain(result.body.contact), { phone: '+357 11111111', email: 'operator@example.test' });
  assert.doesNotMatch(JSON.stringify(result.body), /private@example\.test|re_mock/);
  assert.equal(deliveries.length, 0);
  const blank = await contactRoute({}, deliveries, null).POST(contactRequest);
  assert.equal(blank.status, 503);
  assert.deepEqual(plain(blank.body.contact), { phone: null, email: null });
});

function forgotPasswordRoute(env: Record<string, string>, calls: { lookups: number; persisted?: any; emails: any[] }, token = 'test-token') {
  return loadIsolated('app/api/auth/forgot-password/route.ts', {
    'next/server': response,
    '@/lib/db': { db: {
      user: {
        findUnique: async () => { calls.lookups++; return { id: 'test-user' }; },
        update: async ({ data }: any) => { calls.persisted = data; },
      },
      storeSettings: { findFirst: async () => ({ companyName: 'Example Taxi', storeEmail: 'office@example.test' }) },
    } },
    zod,
    crypto: { __esModule: true, default: { randomBytes: () => ({ toString: () => token }), createHash } },
    '@/lib/email': { sendPasswordResetEmail: async (...args: any[]) => { calls.emails.push(args); } },
    '@/lib/email-config': emailConfig,
    '@/lib/rate-limit': { checkRateLimit: async () => ({ success: true }) },
  }, { process: { env: { NEXT_PUBLIC_APP_URL: 'https://taxi.example.test', ...env } } });
}

test('password reset uses configured company branding, a one-hour lifetime and stores only the token hash', async () => {
  const now = Date.now();
  const calls = { lookups: 0, persisted: undefined as any, emails: [] as any[] };
  const route = forgotPasswordRoute(configuredEnv, calls);
  const result = await route.POST({ headers: { get: () => null }, json: async () => ({ email: 'alex@example.test' }) });
  assert.equal(result.status, 200);
  assert.equal(calls.persisted.resetToken, createHash('sha256').update('test-token').digest('hex'));
  assert.notEqual(calls.persisted.resetToken, 'test-token');
  assert.ok(Math.abs(calls.persisted.resetTokenExpiry.getTime() - now - 3_600_000) < 5_000);
  assert.equal(calls.emails[0][1], 'https://taxi.example.test/reset-password?token=test-token');
  assert.equal(calls.emails[0][2], 'Example Taxi');
  assert.equal(calls.emails[0][3], 'office@example.test');
});

test('password reset answers 503 before any user lookup when email is not configured', async () => {
  const calls = { lookups: 0, persisted: undefined as any, emails: [] as any[] };
  const route = forgotPasswordRoute({}, calls);
  const result = await route.POST({ headers: { get: () => null }, json: async () => ({ email: 'alex@example.test' }) });
  assert.equal(result.status, 503);
  assert.deepEqual(plain(result.body), { code: 'EMAIL_NOT_CONFIGURED', message: 'Password reset by email is not available right now. Please contact us for help.' });
  assert.equal(calls.lookups, 0);
  assert.equal(calls.persisted, undefined);
  assert.equal(calls.emails.length, 0);
});

test('reset-password looks the token up by its SHA-256 hash and enforces the 8 character minimum', async () => {
  const seen: Record<string, any> = {};
  const route = loadIsolated('app/api/auth/reset-password/route.ts', {
    'next/server': response,
    '@/lib/db': { db: { user: {
      findFirst: async (query: any) => { seen.where = query.where; return { id: 'test-user' }; },
      update: async ({ data }: any) => { seen.updated = data; },
    } } },
    zod,
    bcryptjs: { __esModule: true, default: { hash: async (value: string) => `hashed:${value}` } },
    crypto: { __esModule: true, default: { createHash } },
  });
  const post = (body: any) => route.POST({ json: async () => body });
  assert.equal((await post({ token: 'raw-token', password: 'short' })).status, 400);
  assert.equal('where' in seen, false);
  assert.equal((await post({ token: 'raw-token', password: 'x'.repeat(101) })).status, 400);
  assert.equal((await post({ token: 'raw-token', password: 'long-enough' })).status, 200);
  assert.equal(seen.where.resetToken, createHash('sha256').update('raw-token').digest('hex'));
  assert.ok(Math.abs(seen.where.resetTokenExpiry.gt.getTime() - Date.now()) < 5_000);
  assert.equal(seen.updated.password, 'hashed:long-enough');
  assert.equal(seen.updated.resetToken, null);
});
