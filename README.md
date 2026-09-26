# Taxi System: Client Booking App, Driver Dispatch, and Real-Time Admin Panel

A fully functional taxi booking platform with Stripe, Admin Panel and CMS. This template is a complete transportation management ecosystem developed for taxi and transfer businesses who need to launch and scale their booking operations quickly. It provides a seamless transition from setup to first booking, combining a high-conversion booking interface with a powerful management suite allowing you to run a professional taxi service without extensive technical overhead.

## Customer Experience

The customer-facing storefront is designed to maximize booking conversions, featuring a multi-step booking form with real-time route mapping and automatic distance-based pricing. The payment flow is fully automated through Stripe integration, ensuring secure card payments alongside cash-on-arrival support, with promotional discount codes built in. To build passenger loyalty, the system includes dedicated user profiles where customers can manage their accounts and track their booking history in real-time.

## Operational Control

For operational control, the platform features a centralized Admin Dashboard with clear booking analytics. You can manage your entire fleet of vehicles through tariff plans, assign drivers to trips, and update booking statuses effortlessly. Additionally, the built-in CMS allows you to update informational pages FAQs, service areas, and legal documents directly from the interface without writing a single line of code.

## Performance & SEO

The platform is optimized for growth from day one: automated SEO generation and high-speed performance ensure your service is search-engine friendly and provides a premium experience on mobile, tablet, and desktop devices.

## Technical Stack & Infrastructure

- ⚡ **Framework:** Next.js 14 (App Router) & TypeScript
- 🗄️ **Database:** PostgreSQL with Prisma ORM
- 💳 **Payments:** Stripe Integration (PCI-compliant) + Cash on Arrival support
- 🔐 **Authentication:** NextAuth v5 (Google, GitHub, and Email/Password)
- 📩 **Email:** Resend - automated booking confirmations for customers and admins
- 🚀 **Performance:** Rate limiting via Redis and built-in SEO optimization
- ☁️ **Deployment:** Fully optimized for Vercel and serverless environments

## Getting Started

To set up, run, and deploy this project, please refer to our official guides:

1. **First-Step Guide (Start Here):**  
   [https://www.ownyourwebsite.app/help](https://www.ownyourwebsite.app/help) — Read this first to quickly understand how the template works and get it running.

2. **Deployment Guide:**  
   [https://www.ownyourwebsite.app/docs/deploy](https://www.ownyourwebsite.app/docs/deploy) — Step-by-step instructions on deploying your website to production.

3. **Environment Variables Config:**  
   [https://www.ownyourwebsite.app/docs/env](https://www.ownyourwebsite.app/docs/env) — Information on which environment variables are required and how to obtain them.

### Supported toolchain

Use Node.js 22 (the exact tested release is recorded in `.nvmrc`) and npm 10.
Install the committed dependency graph with `npm ci`; keep `package-lock.json`
with the purchased source. The included Template CI workflow installs from the
lockfile, runs tests and TypeScript, rehearses the production database build
contract on PostgreSQL 16, repeats the safe bootstrap, and rejects
migration/schema drift.

## Database deployment contract

After the environment variables are configured, the production `build` command
generates Prisma Client, applies committed migrations with
`prisma migrate deploy`, runs the safe database bootstrap, and builds the app.
There is no separate manual production seed step.

The bootstrap is idempotent. A clean database receives store settings, required
CMS/legal pages, an FAQ item, and one active starter tariff. Repeat deployments
leave owner-edited settings, content, and tariffs unchanged. It can also be run
explicitly with `npm run db:bootstrap` (or `npm run db:seed`).

The included legal text and tariff prices are editable starting points, not
business or legal advice. Review company details, service area, all prices,
payment methods, cancellation terms, and legal pages before accepting bookings.

Use separate Preview and Production databases. Never point Preview at the
Production database, because each deployment applies migrations to the database
configured for that environment.

`DATABASE_URL` is the pooled runtime connection. `DIRECT_URL` must be a direct,
unpooled connection to the same PostgreSQL database, branch, and schema; Prisma
uses it when applying migrations during deployment.

## Stripe payment contract

Stripe is optional for a cash-only deployment. To accept card payments, configure
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and a stable
`STRIPE_DEPLOYMENT_ID`, then register the exact webhook URL and event list
documented in [STRIPE_SETUP.md](./STRIPE_SETUP.md). This template creates Stripe
Checkout Sessions on the server and does not require a publishable Stripe key in
the browser. The deployment ID isolates this site when one Stripe account serves
multiple websites; keep it unchanged after accepting payments.

The signed webhook at `/api/stripe/webhooks` is the primary source of truth for
payment settlement. The success page sends a JSON `POST` request to
`/api/stripe/confirm` as a browser-return recovery path; it is not a webhook
destination and there is no mutating confirmation `GET` endpoint.

The included `vercel.json` also schedules `/api/cron/reconcile-stripe` daily at
04:15 UTC. Set `CRON_SECRET` so Vercel can authenticate that request. The cron
checks unresolved Stripe trips in batches and recovers from a delayed or missed
browser return/webhook, but it does not replace the webhook. Vercel Hobby cron
jobs can run at most once per day and their execution time may vary, so payment
confirmation must never depend on the cron running immediately.

Vercel Hobby is suitable for personal, non-commercial demos and previews. Use a
commercially permitted Vercel plan or another suitable host for a production
taxi business site.

The first successful settlement also creates a durable booking-email delivery
record in the same database transaction. Webhook, browser confirmation, and cron
delivery attempts reuse deterministic provider idempotency keys. A failed email
therefore remains retryable without reverting or duplicating payment settlement.

## License Configuration

All configuration values (including `LICENSE_KEY`, `LICENSE_PRODUCT`, or any other license-related keys) will be sent directly to your email address immediately after purchase. Simply paste them into your environment variables when configuring the project!
