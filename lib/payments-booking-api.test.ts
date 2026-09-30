import assert from 'node:assert/strict';
import test from 'node:test';
import * as zod from 'zod';
import * as pricing from './pricing';
import * as validation from './validations';
import * as errors from './validation-errors';
import { stripeConfiguration, paymentAvailability } from './payment-availability';
import { validBooking } from './test-support/booking-fixture';
import { loadIsolated } from './test-support/load-isolated';

const completeEnv = { STRIPE_SECRET_KEY: 'test-placeholder', STRIPE_DEPLOYMENT_ID: 'isolated-test-site', STRIPE_WEBHOOK_SECRET: 'test-placeholder' };

test('Stripe availability requires all server variables; admin flag is not credentials verification; cash is independent', () => {
  for (const missing of Object.keys(completeEnv)) {
    const status = stripeConfiguration({ ...completeEnv, [missing]: '  ' });
    assert.equal(status.configured, false);
    assert.deepEqual(paymentAvailability(null, status.configured), { card: false, cash: true });
    assert.equal(Object.values(status.present).every(value => typeof value === 'boolean'), true);
    assert.doesNotMatch(JSON.stringify(status), /test-placeholder|isolated-test-site/);
  }
  assert.equal(stripeConfiguration(completeEnv).configured, true);
  assert.deepEqual(paymentAvailability({ enableCardPayment: false, enableCashPayment: true }, true), { card: false, cash: true });
  assert.deepEqual(paymentAvailability({ enableCardPayment: true, enableCashPayment: false }, false), { card: false, cash: false });
});

test('actual Stripe factory remains lazy and rejects incomplete deployment configuration without constructing SDK', () => {
  let constructions = 0;
  const env: Record<string, string> = {};
  const stripe = loadIsolated('lib/stripe.ts', {
    stripe: { __esModule: true, default: class { constructor() { constructions++; } } },
    './payment-availability': { stripeConfiguration },
  }, { process: { env } });
  assert.equal(constructions, 0);
  assert.equal(stripe.isStripeConfigured(), false);
  assert.throws(() => stripe.getStripe(), /incomplete/);
  Object.assign(env, completeEnv);
  assert.equal(stripe.isStripeConfigured(), true);
  assert.equal(stripe.getStripe(), stripe.getStripe());
  assert.equal(constructions, 1);
  delete env.STRIPE_DEPLOYMENT_ID;
  assert.throws(() => stripe.getStripe(), /incomplete/);
  assert.equal(constructions, 1);
});

function bookingApi(options: { configured?: boolean; card?: boolean; cash?: boolean; providerFails?: boolean } = {}) {
  const calls = { routes: 0, stripe: 0, writes: [] as any[], sessions: [] as any[] };
  const tariff = { id: validBooking().tariffPlanId, name: 'Standard', currency: 'EUR', basePrice: '10', pricePerKm: '1', pricePerMin: '0', minPrice: '10', maxPassengers: 4, zones: [] };
  class RouteCalculationError extends Error {}
  const route = loadIsolated('app/api/trips/route.ts', {
    '@/lib/auth': { auth: async () => null },
    '@/lib/rate-limit': { checkRateLimit: async () => ({ success: true }) },
    '@/lib/db': { db: {
      trip: {
        findUnique: async () => null,
        create: async ({ data }: any) => { calls.writes.push(data); return { ...data, id: 'trip-test', tariffPlan: tariff }; },
        update: async () => {},
      },
      tariffPlan: { findUnique: async () => tariff },
      storeSettings: { findFirst: async () => ({ enableCardPayment: options.card ?? true, enableCashPayment: options.cash ?? true, storeEmail: 'operator@example.com' }) },
    } },
    '@/lib/stripe': {
      isStripeConfigured: () => options.configured ?? false,
      getStripeDeploymentId: () => 'isolated-test-site',
      getStripe: () => {
        calls.stripe++;
        return { checkout: { sessions: { create: async (data: any, opts: any) => {
          calls.sessions.push({ data, opts });
          if (options.providerFails) throw new Error('Provider refused credentials');
          return { id: 'session-test', url: 'https://checkout.example.test/session' };
        } } } };
      },
    },
    'next/server': { NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) } },
    '@/lib/validations': validation, '@/lib/validation-errors': errors,
    '@/lib/order-number': { generateOrderNumber: async () => 'TEST-1' }, zod,
    '@/lib/email': { sendBookingEmails: async () => {} },
    '@/lib/google-routes': { RouteCalculationError, computeDrivingRoute: async (pickup: any, dropoff: any) => {
      calls.routes++;
      assert.equal(pickup.latitude, validBooking().pickup.latitude);
      assert.equal(dropoff.longitude, validBooking().dropoff.longitude);
      return { distanceMeters: 10000, durationSeconds: 600 };
    } },
    '@/lib/pricing': pricing,
  }, { process: { env: { NEXT_PUBLIC_APP_URL: 'https://taxi.example.test' } } });
  return { calls, post: (body: any) => route.POST({ headers: { get: () => null }, json: async () => body }) };
}

test('cash booking works without Stripe and uses server route/pricing; invalid date fails before provider/write', async () => {
  const api = bookingApi();
  const cash = await api.post(validBooking());
  assert.equal(cash.status, 200);
  assert.equal(api.calls.stripe, 0);
  assert.equal(api.calls.routes, 1);
  assert.equal(api.calls.writes[0].paymentStatus, 'PENDING');
  assert.equal(api.calls.writes[0].pickupLat, validBooking().pickup.latitude);
  const bad = await api.post({ ...validBooking(), pickupDateTime: '2000-01-01T00:00:00Z' });
  assert.equal(bad.status, 400);
  assert.match(bad.body.fieldErrors.pickupDateTime, /future/);
  assert.equal(api.calls.routes, 1);
  assert.equal(api.calls.writes.length, 1);
});

test('unconfigured/disabled card and disabled cash reject without charging, routing or booking', async () => {
  for (const [options, method, status] of [
    [{ configured: false }, 'STRIPE', 503],
    [{ configured: true, card: false }, 'STRIPE', 400],
    [{ cash: false }, 'CASH', 400],
  ] as const) {
    const api = bookingApi(options);
    const response = await api.post({ ...validBooking(), paymentMethod: method });
    assert.equal(response.status, status);
    assert.equal(api.calls.stripe, 0);
    assert.equal(api.calls.routes, 0);
    assert.equal(api.calls.writes.length, 0);
  }
});

test('configured card creates real checkout request with deployment binding; provider failure never returns fake success', async () => {
  const api = bookingApi({ configured: true });
  const response = await api.post({ ...validBooking(), paymentMethod: 'STRIPE' });
  assert.equal(response.status, 200);
  assert.equal(response.body.url, 'https://checkout.example.test/session');
  assert.equal(api.calls.sessions[0].data.metadata.deploymentId, 'isolated-test-site');
  assert.equal(api.calls.sessions[0].data.payment_intent_data.metadata.deploymentId, 'isolated-test-site');
  assert.equal(api.calls.sessions[0].opts.idempotencyKey, `booking/${validBooking().bookingRequestId}`);
  assert.equal(api.calls.writes[0].paymentStatus, 'UNPAID');
  const failing = bookingApi({ configured: true, providerFails: true });
  const failure = await failing.post({ ...validBooking(), paymentMethod: 'STRIPE' });
  assert.equal(failure.status, 500);
  assert.equal(failure.body.url, undefined);
  assert.equal(failing.calls.writes[0].paymentStatus, 'UNPAID');
});
