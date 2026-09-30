# Stripe Setup Instructions

Stripe is optional. Skip this guide if the deployment accepts cash only. Cash
bookings do not initialize the Stripe client and do not require Stripe secrets.

## 1. Choose test or live mode

Configure and verify the integration with Stripe test-mode keys first. Switch to
live-mode keys only when the business is ready to accept real payments. Do not
mix test keys, live keys, or webhook secrets from different Stripe modes.

The app creates Stripe Checkout Sessions entirely on the server. It currently
does not read a publishable Stripe key, so no `pk_test_...` or `pk_live_...`
environment variable is required.

## 2. Configure the server key and deployment ID

In Stripe Dashboard, open **Developers → API keys** and copy the secret key for
the selected mode. Add it to the matching Vercel environment:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_DEPLOYMENT_ID=taxi-yourdomain-com
```

Use `sk_live_...` only in the Production environment when enabling real
payments. `STRIPE_DEPLOYMENT_ID` is not a secret, but it must be unique to this
website and remain unchanged after the site starts creating payments. Checkout
Sessions and PaymentIntents carry this marker so a shared Stripe account cannot
send another website's events into this site's settlement flow. Keep secret keys
server-only and never expose them through a `NEXT_PUBLIC_` variable.

## 3. Register the webhook

In **Stripe Dashboard → Developers → Webhooks**, create an endpoint for:

```text
https://your-domain.example/api/stripe/webhooks
```

Subscribe that endpoint to every event handled by this template:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`
- `checkout.session.async_payment_failed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

Copy this endpoint's signing secret and add it to the same Vercel environment:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

Test and live webhook endpoints have different signing secrets. After changing
an environment variable, redeploy the affected Vercel environment.

The webhook is the primary payment-settlement mechanism. Stripe signs its raw
request body; do not route it through a proxy that rewrites the body.

## 4. Configure reconciliation

The committed `vercel.json` schedules this protected recovery endpoint every day
at 04:15 UTC:

```text
/api/cron/reconcile-stripe
```

Generate a secret locally, for example with `openssl rand -base64 32`, and add:

```env
CRON_SECRET=replace-with-a-random-secret
```

Vercel sends it as `Authorization: Bearer <CRON_SECRET>` when invoking the cron
route. On another hosting provider, configure its scheduler to make the same
authenticated `GET` request.

Reconciliation checks at most 50 oldest unresolved Stripe trips per run. It is a
safety net for delayed or missed delivery, not a replacement for the webhook.
On Vercel Hobby, cron jobs are limited to one run per day and their execution
time is not precise enough for immediate payment confirmation. Hobby is suitable
only for personal, non-commercial demos and previews; use a commercially
permitted Vercel plan or another suitable host for a production taxi business
site.

The same run retries up to 50 pending booking-email deliveries. Email delivery
state is stored separately from payment state, so an email provider failure does
not roll back a completed payment. Customer and admin messages use stable
idempotency keys when retried.

## 5. Understand browser confirmation

After Stripe redirects the customer back, the success page sends:

```http
POST /api/stripe/confirm
Content-Type: application/json

{
  "sessionId": "cs_...",
  "tripId": "..."
}
```

This is an idempotent recovery path. It retrieves the Checkout Session from
Stripe and validates its trip, amount, currency, and PaymentIntent binding before
settlement. Do not register this route in Stripe Dashboard, and do not call it
with `GET` query parameters.

## 6. Test before enabling live payments

For local webhook testing, use the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhooks
```

Put the temporary `whsec_...` printed by the CLI in `.env.local` as
`STRIPE_WEBHOOK_SECRET`, then restart the development server. Use Stripe test
mode and a documented test card such as `4242 4242 4242 4242`; never use that
card to test live mode.

Verify all of the following before launch:

1. A successful card payment marks exactly one trip paid and confirmed.
2. Re-delivering a success event does not duplicate settlement.
3. A failed payment attempt does not cancel a still-retryable trip.
4. An expired Checkout Session fails payment and cancels an unpaid pending trip.
5. Refund events only increase the cumulative refunded amount and cannot regress
   a fully refunded trip to partially refunded.
6. Cash booking still works when all Stripe variables are absent.
7. A signed event carrying another site's `STRIPE_DEPLOYMENT_ID` is ignored and
   cannot mutate a local trip.
8. Stripe Dashboard shows successful `2xx` webhook deliveries.

Monitor webhook delivery failures in Stripe Dashboard after launch. A cron
recovery run cannot replace correct webhook configuration.

## Configuration diagnostics and booking availability

Admin Settings → Payment Methods shows presence-only diagnostics for the three
server variables defined in this guide. A configured secret key alone is not
enough: both the stable deployment marker and webhook secret must also be present.
The admin card switch expresses business intent; it does not configure Stripe.
Public booking offers cards only when the switch and server configuration permit
it. Cash-only deployments do not initialize Stripe.

Presence checks do not validate credentials, mode, webhook registration, or
provider connectivity. Complete a test-mode payment and verify webhook delivery
before enabling real payments. After changing deployment environment settings,
restart or redeploy; do not change the deployment marker for existing payments.
See the [bugfix and runtime-contract report](BUGFIX_REPORT.md) for regression
coverage and remaining manual checks.
