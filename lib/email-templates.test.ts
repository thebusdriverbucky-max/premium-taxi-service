import assert from 'node:assert/strict';
import test from 'node:test';
import * as templates from './email-templates';
import { loadIsolated } from './test-support/load-isolated';
import { emailTripFixture } from './test-support/email-fixture';

function isolated(env: Record<string, string> = { NEXT_PUBLIC_APP_URL: 'https://taxi.example.test' }) {
  return loadIsolated<typeof templates>('lib/email-templates.ts', {}, { process: { env } });
}

test('all email types use the same saturated gold, solid fallbacks, readable footer and table layout', () => {
  const email = isolated();
  const data = emailTripFixture();
  const htmls = [
    email.buildCustomerEmailHtml(data, 'Example Taxi'),
    email.buildAdminEmailHtml(data, 'Example Taxi'),
    email.getOrderStatusUpdateEmailHtml(data.id, 'CONFIRMED', 'Example Taxi'),
    email.getPasswordResetEmailHtml('https://taxi.example.test/reset-password?token=preview', 'Example Taxi'),
    email.getAdminContactEmailHtml('Alex', 'alex@example.test', 'Pickup question', 'Hello\nSecond line', 'Example Taxi'),
    email.getCustomerContactEmailHtml('Alex', 'Pickup question', 'office@example.test', 'Example Taxi'),
    email.getOrderConfirmationEmailHtml({ orderId: data.id, orderNumber: 'TRP-1', total: 75, items: [], storeName: 'Example Taxi', supportEmail: '', storeUrl: 'https://taxi.example.test' }),
  ];
  for (const html of htmls) {
    assert.match(html, /bgcolor="#D4AF37"/);
    assert.match(html, /background-color:#D4AF37;background-image:linear-gradient/);
    assert.match(html, /class="email-header"/);
    assert.match(html, /max-width:600px/);
    assert.match(html, /color:#93A1B3;font-size:12px/);
    assert.match(html, /role="presentation"/);
    assert.doesNotMatch(html, /#BF953F|#FCF6BA|display:flex|#[\da-fA-F]{8}\b/);
    assert.doesNotMatch(html, /undefined|NaN|Invalid Date/);
  }
});

test('a pending booking is received, not confirmed; driver will contact the customer without promising a phone call', () => {
  const html = isolated().buildCustomerEmailHtml(emailTripFixture(), 'Example Taxi');
  assert.match(html, /Booking Received/);
  assert.match(html, /Awaiting confirmation/);
  assert.match(html, /Your driver will contact you to confirm the pickup details\./);
  assert.doesNotMatch(html, /Booking Confirmed|will call|tracking|24 hours/i);
  assert.match(html, /TRP-2026-0042/);
  assert.match(html, /href="https:\/\/taxi.example.test\/trips\/trip-preview-000042"/);
  assert.match(html, /Full booking details may require you to sign in/);
});

test('cash and paid card emails display actual payment state independently from booking state', () => {
  const email = isolated();
  for (const render of [email.buildCustomerEmailHtml, email.buildAdminEmailHtml]) {
    const cash = render(emailTripFixture(), 'Example Taxi');
    assert.match(cash, /Cash to driver/);
    assert.match(cash, /Due to driver/);
    assert.match(cash, /Please pay the driver in cash/);
    assert.doesNotMatch(cash, /Your payment has been received/);
    const card = render(emailTripFixture({ status: 'CONFIRMED', paymentMethod: 'STRIPE', paymentStatus: 'PAID' }), 'Example Taxi');
    assert.match(card, />Card</);
    assert.match(card, />Paid</);
    assert.match(card, /Your payment has been received/);
    assert.doesNotMatch(card, /Cash to driver|Due to driver/);
  }
});

test('current JSON extras are shown in both emails and take precedence over legacy notes', () => {
  const email = isolated();
  for (const render of [email.buildCustomerEmailHtml, email.buildAdminEmailHtml]) {
    const html = render(emailTripFixture({ notes: '[EXTRAS: CHILD_SEAT:9]\nNotes for driver: Meet at arrivals.\nThank you!' }), 'Example Taxi');
    assert.match(html, /Extra luggage/);
    assert.match(html, /2 × Large/);
    assert.match(html, /Child seat/);
    assert.match(html, /1 ×/);
    assert.match(html, /Meet at arrivals\.<br>Thank you!/);
    assert.doesNotMatch(html, /9 ×|\[EXTRAS:|Notes for driver:/);
  }
});

test('legacy bookings still show their extras; current empty JSON does not resurrect stale extras', () => {
  const email = isolated();
  const notes = '[EXTRAS: ADD_LUGGAGE:3:Standard, CHILD_SEAT:2]\nNotes for driver: Please wait outside.';
  const html = email.buildCustomerEmailHtml(emailTripFixture({ extras: null, notes }), 'Example Taxi');
  assert.match(html, /3 × Standard/);
  assert.match(html, /2 ×/);
  assert.match(html, /Please wait outside/);
  const current = email.buildCustomerEmailHtml(emailTripFixture({ extras: {}, notes }), 'Example Taxi');
  assert.doesNotMatch(current, /Additional services|3 × Standard/);
});

test('absent or malformed optional data does not create empty sections or broken values', () => {
  const email = isolated();
  const html = email.buildAdminEmailHtml(emailTripFixture({
    extras: { luggage: { quantity: -1 }, childSeats: { quantity: 'many' } },
    notes: '', flightNumber: '', distance: undefined, duration: undefined,
    customerEmail: '', customerPhone: '', pickupDate: 'invalid', price: Number.NaN,
  }), 'Example Taxi');
  assert.doesNotMatch(html, /Additional services|Notes for the driver|Flight number|Estimated distance|NaN|Invalid Date/);
  assert.match(html, /Not provided/);
  assert.match(html, /Schedule unavailable/);
  assert.match(html, /Amount unavailable/);
});

test('prices use the actual currency, decimal places and recorded discount', () => {
  const email = isolated();
  for (const currency of ['EUR', 'USD', 'GBP', 'CAD', 'AUD', 'JPY']) {
    const html = email.buildCustomerEmailHtml(emailTripFixture({ currency, price: 1234.5, discountAmount: 5 }), 'Example Taxi');
    assert.ok(html.includes(new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(1234.5)));
    assert.ok(html.includes(`Includes a discount of ${new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(5)}`));
  }
  assert.match(email.buildCustomerEmailHtml(emailTripFixture({ currency: 'not-a-currency' }), 'Example Taxi'), /75\.50 not-a-currency/);
});

test('booking templates escape company, passenger, route, notes, extras and all status/payment inputs', () => {
  const email = isolated();
  const attack = '<img src=x onerror="alert(1)"> & \'test\'';
  const data = emailTripFixture({
    tripNumber: attack, customerName: attack, customerEmail: attack, customerPhone: attack,
    pickupLocation: attack, dropoffLocation: attack, tariffName: attack, flightNumber: attack,
    notes: attack, extras: { luggage: { quantity: 2, size: attack } },
    status: attack, paymentStatus: attack, paymentMethod: attack, currency: attack,
  });
  for (const render of [email.buildCustomerEmailHtml, email.buildAdminEmailHtml]) {
    const html = render(data, attack);
    assert.doesNotMatch(html, /<img|<script|href="javascript:/i);
    assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt; &amp; &#39;test&#39;/);
    assert.match(html, /Payment status unavailable/);
  }
});

test('every supported trip status has a friendly label and a correct message', () => {
  const email = isolated();
  for (const [status, label, message] of [
    ['PENDING', 'Awaiting confirmation', 'awaiting confirmation'],
    ['CONFIRMED', 'Confirmed', 'has been confirmed'],
    ['IN_PROGRESS', 'In progress', 'now in progress'],
    ['COMPLETED', 'Completed', 'trip is complete'],
    ['CANCELLED', 'Cancelled', 'has been cancelled'],
    ['REFUNDED', 'Refunded', 'marked as refunded'],
  ]) {
    const html = email.getOrderStatusUpdateEmailHtml('trip-123456', status, 'Example Taxi', 'Alex Driver', { tripNumber: 'TRP-42', driverPhone: '+357 00000000' });
    assert.match(html, new RegExp(label));
    assert.match(html, new RegExp(message));
    assert.match(html, /TRP-42/);
    assert.doesNotMatch(html, /Driver \/ Tracking Info|tracking number|>IN_PROGRESS</i);
    if (['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(status)) {
      assert.match(html, /Your driver/);
      assert.match(html, /Alex Driver/);
      assert.match(html, /\+357 00000000/);
    } else {
      assert.doesNotMatch(html, /Alex Driver|\+357 00000000/);
    }
  }
});

test('cancellation does not imply a refund; refund wording uses the real payment state', () => {
  const email = isolated();
  assert.match(email.getOrderStatusUpdateEmailHtml('trip-42', 'CANCELLED', 'Example Taxi'), /does not confirm a refund/);
  const refunded = email.getOrderStatusUpdateEmailHtml('trip-42', 'REFUNDED', 'Example Taxi', null, { paymentStatus: 'REFUNDED' });
  assert.match(refunded, /A refund has been recorded/);
  assert.doesNotMatch(refunded, /within \d|bank account|immediately/i);
  const partial = email.getOrderStatusUpdateEmailHtml('trip-42', 'REFUNDED', 'Example Taxi', null, { paymentStatus: 'PARTIALLY_REFUNDED' });
  assert.match(partial, /Partially refunded/);
  assert.match(partial, /marked as refunded/);
  assert.doesNotMatch(partial, /A refund has been recorded/);
});

test('unknown status is safe, and legacy status callers receive a consistent short reference', () => {
  const html = isolated().getOrderStatusUpdateEmailHtml('trip-abcdef', '<script>bad</script>', '<b>Taxi</b>');
  assert.match(html, /Status updated/);
  assert.match(html, /ABCDEF/);
  assert.doesNotMatch(html, /<script>|<b>Taxi<\/b>/);
});

test('app URL uses supported fallbacks and omits buttons instead of emitting broken or unsafe links', () => {
  for (const key of ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SITE_URL', 'NEXTAUTH_URL']) {
    const email = isolated({ [key]: 'https://taxi.example.test/' });
    assert.equal(email.getEmailAppUrl('/admin/trips'), 'https://taxi.example.test/admin/trips');
    assert.match(email.buildAdminEmailHtml(emailTripFixture(), 'Taxi'), /href="https:\/\/taxi.example.test\/admin\/trips"/);
  }
  for (const url of ['', 'javascript:alert(1)', 'https://user:password@example.test', 'invalid']) {
    const email = isolated({ NEXT_PUBLIC_APP_URL: url });
    const html = email.buildCustomerEmailHtml(emailTripFixture({ supportEmail: '' }), 'Taxi');
    assert.doesNotMatch(html, /href="#"|href="javascript:|>View Booking</);
  }
});

test('password reset matches the one-hour expiry, escapes query strings and rejects unsafe links', () => {
  const email = isolated();
  const html = email.getPasswordResetEmailHtml('https://taxi.example.test/reset-password?token=example&source=email', '<b>Taxi</b>');
  assert.match(html, /1 hour/);
  assert.match(html, /token=example&amp;source=email/);
  assert.match(html, /unless you complete the reset/);
  assert.match(html, /&lt;b&gt;Taxi&lt;\/b&gt;/);
  assert.doesNotMatch(email.getPasswordResetEmailHtml('javascript:alert(1)', 'Taxi'), /href=/);
});

test('contact messages are escaped, preserve line breaks and do not promise a 24-hour response', () => {
  const email = isolated();
  const html = email.getAdminContactEmailHtml('<b>Alex</b>', 'alex@example.test', 'A & B?', '<script>bad</script>\nSecond line', '<b>Taxi</b>');
  assert.match(html, /&lt;script&gt;bad&lt;\/script&gt;<br>Second line/);
  assert.match(html, /mailto:alex%40example.test\?subject=Re%3A%20A%20%26%20B%3F/);
  assert.doesNotMatch(html, /<script>|<b>/);
  const customer = email.getCustomerContactEmailHtml('Alex', 'Pickup time', 'office@example.test', 'Taxi');
  assert.match(customer, /as soon as possible/);
  assert.match(customer, /office@example.test/);
  assert.doesNotMatch(customer, /24 hours|within \d/i);
});
