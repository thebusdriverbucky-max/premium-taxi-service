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
- 🚀 **Performance:** Optional rate limiting via Upstash Redis and built-in SEO optimization
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

## Admin account setup (do this right after the first deploy)

The admin panel is unlocked by the `ADMIN_EMAIL` environment variable: whoever
signs in with exactly that email address receives the admin role. There is no
separate admin invite step, which keeps the setup short, but it means the order
of steps matters:

1. Set `ADMIN_EMAIL` to the address you will use as the site owner.
2. Deploy the site.
3. **Immediately** open `/register` on the deployed site and create an account
   with exactly that email address.
4. Only after that, connect your custom domain and share the site URL.

Until the admin account exists, anyone who knows the deployment URL could
register with that email address first. If you find an admin account you did
not create, contact support (see [Support](#support)) and we will help you
remove it in your database SQL editor. Afterwards, generate a new
`NEXTAUTH_SECRET` and redeploy: sessions are signed with that secret and stay
valid for up to 30 days, so rotating it is what signs out an existing
unauthorized session (all users will need to sign in again).

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
browser return/webhook, but it does not replace the webhook. It also cancels
card bookings whose Stripe Checkout never started (older than one hour), so a
failed attempt does not stay pending in the admin panel. Vercel Hobby cron
jobs can run at most once per day and their execution time may vary, so payment
confirmation must never depend on the cron running immediately.

Vercel Hobby is suitable for personal, non-commercial demos and previews. Use a
commercially permitted Vercel plan or another suitable host for a production
taxi business site.

The first successful settlement also creates a durable booking-email delivery
record in the same database transaction. Webhook, browser confirmation, and cron
delivery attempts reuse deterministic provider idempotency keys. A failed email
therefore remains retryable without reverting or duplicating payment settlement.

### Refunds

The admin panel has no refund button. Issue card refunds in the Stripe Dashboard
(Payments → select the payment → Refund). The `charge.refunded` webhook then
updates the trip automatically: a partial refund marks the payment as partially
refunded, and a full refund marks both the payment and the trip as refunded.
Cash payments are settled outside the site, so refund them directly to the
customer and update the trip status in the admin panel if needed.

## Email delivery

Email is sent through [Resend](https://resend.com) and is optional for a first
deploy, but without it the site cannot send booking confirmations, password
reset links, contact form messages, or trip status updates.

- **`RESEND_API_KEY` is not set:** nothing is sent. The contact form and the
  forgot-password page tell visitors that email is unavailable and show the
  phone number and email from Admin → Settings, so fill those in. The admin
  area shows a warning banner.
- **`RESEND_API_KEY` is set but `EMAIL_FROM` is not:** mail is sent from
  Resend's test sender (`onboarding@resend.dev`), which Resend delivers only to
  your own Resend account email. Customers receive nothing, and the admin
  banner says so.
- **Both are set:** `EMAIL_FROM` must use a domain verified in Resend. The admin
  panel can only check that the variables are present, so make a test booking
  to confirm delivery.

Card booking confirmations are kept in the email outbox and retried by the daily
cron while the booking is recent (48 hours) or the ride is still upcoming, so
configuring email shortly after a booking still delivers it. Cash booking
emails are sent once, when the booking is made.

## Support

Questions, setup problems, or an admin account you did not create:

- Contact form: [https://www.ownyourwebsite.app/contact](https://www.ownyourwebsite.app/contact)
- Email: [support@ownyourwebsite.app](mailto:support@ownyourwebsite.app)

## License Configuration

All configuration values (including `LICENSE_KEY`, `LICENSE_PRODUCT`, or any other license-related keys) will be sent directly to your email address immediately after purchase. Simply paste them into your environment variables when configuring the project!
