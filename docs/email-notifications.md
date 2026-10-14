# Transactional email catalogue

All active emails use one dark-and-gold layout, including admin notifications,
customer bookings, status updates, contact messages and password reset. The base
gold is **#D4AF37**, with **#E5BC4B** for text accents. The header and buttons have
solid gold backgrounds as well as an optional gradient: a client that ignores
gradients must not show a transparent or pale button. Layout uses presentation
tables, inline styles and a 600px desktop width with narrower mobile padding.

## Offline preview

Run the **email:preview** package command from the project directory:

```sh
npm run email:preview
```

Open [the generated gallery](../.email-preview/index.html) in a browser. It contains
14 examples, including cash/card booking variants, all six statuses, contact
emails and password reset. The width toggle shows a 375px mobile preview.

The [preview generator](../scripts/preview-emails.ts) imports only rendering code
and fictional fixtures. It does not load local credentials, connect to the DB,
send mail, create a booking or deploy anything. Generated previews are ignored
by Git. The fake addresses and links are not usable production data.

## Actual delivery and wording

| Email / recipient          | Trigger                                                                                                                                    | Main wording and data                                                                                                                                                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Booking / customer, cash   | A cash booking is saved. The customer must have supplied a real email address.                                                             | **Booking Received**; “We have received your booking”; **Awaiting confirmation**; “Your driver will contact you to confirm the pickup details.” Payment is **Cash to driver**, **Due to driver**, not paid.                                                                             |
| Booking / customer, card   | Successful Stripe payment is verified and the booking email outbox is processed. Creating or abandoning Checkout does not send this email. | Normally **Booking Confirmed**, because payment settlement confirms the trip. The current persisted trip/payment statuses are used, including when delivery is retried later. **Paid** means the recorded payment really is paid.                                                       |
| New booking / admin        | The same cash/card events as above, if the notification address is configured.                                                             | **Admin Notification**, “New booking”; passenger name/email/phone, route, scheduled pickup, vehicle class, passenger count, optional flight number, services/notes, total, recorded discount, payment and booking statuses. **Manage Bookings** links to the protected admin trip list. |
| Status update / customer   | An admin changes the trip status to a different value.                                                                                     | Human-friendly status, the same booking number as the original email, current payment status and driver name/phone when applicable. A driver-only edit does not currently trigger an email.                                                                                             |
| Contact / admin            | The contact form passes validation and a recipient is configured.                                                                          | Sender, subject, multiline message and a reply button. Reply-To points to the sender.                                                                                                                                                                                                   |
| Contact receipt / customer | The provider accepted the admin contact message.                                                                                           | “We have received your message. Our team will get back to you as soon as possible.” No guaranteed 24-hour response time. Reply-To points to the operator.                                                                                                                               |
| Password reset / customer  | An existing account requests a reset.                                                                                                      | “This link is valid for 1 hour”, matching the persisted token expiry. The email uses the configured company name, not the old “Store” branding.                                                                                                                                         |

### Booking details

- Both booking emails read luggage and child seats from the current structured
  extras field. Legacy bookings can still use the old extras marker in notes;
  current JSON takes precedence, so services are not duplicated.
- Driver notes preserve line breaks. Names, company names, routes, notes,
  messages and other dynamic values are HTML-escaped before insertion.
- The final stored price and actual currency are shown, rather than recalculating
  a quote inside the email. A recorded discount is explicitly identified as
  already included. Route distance and travel duration are labelled estimates.
- The pickup date/time follows the existing server timezone, now explicitly
  labelled (usually UTC on Vercel). It is **not** automatically converted to the
  pickup location's timezone. Choosing a business timezone consistently across
  booking, admin UI and emails is a separate application-level decision.
- A customer booking link shows public status; full personal details may require
  sign-in with the booking account/email. The email does not promise anonymous
  access to full trip details, self-service rescheduling or cancellation.

### Status messages

| Display label         | Meaning in the email                                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Awaiting confirmation | “Your booking is awaiting confirmation.”                                                                                                                                                          |
| Confirmed             | “Your booking has been confirmed. Your driver will contact you to confirm the pickup details.”                                                                                                    |
| In progress           | “Your trip is now in progress.”                                                                                                                                                                   |
| Completed             | “Your trip is complete. Thank you for travelling with us!”                                                                                                                                        |
| Cancelled             | Cancellation is stated explicitly; the email says this does not confirm a refund.                                                                                                                 |
| Refunded              | A recorded refunded payment is described as a recorded refund. Merely setting the trip status says the booking was “marked as refunded”, without promising that money has reached a bank account. |

No email promises live GPS tracking, automatic phone calls, automated flight
tracking, a response SLA or a particular refund processing time. Driver contact
is an operational action by the taxi company, not an automatic feature of the
template. Driver details are shown only when present and relevant to an upcoming
or in-progress trip.

## Configuration and limits

- Company branding comes from admin settings; default is **Taxi Service**.
- Notification/support address uses the configured company email first, then
  the private admin-email fallback. No fabricated admin address is used.
- Links use the configured public app URL, public site URL or authentication URL.
  Missing/invalid URLs hide buttons rather than producing a dead hash link.
- Reply-To is set for booking/contact notifications so replying does not depend
  on the transactional sender mailbox being monitored.
- Real delivery requires a Resend API key and a verified sender. Without the
  API key the existing development behaviour only logs mock emails. A successful
  booking or test does **not** prove inbox delivery.
- Stripe-driven failure, expiration and refund events update the payment/trip
  state; they do **not** currently send separate status emails. The status email
  trigger remains an admin status change. No new notification trigger or payment
  action was added by this visual/content update.
- Cash booking emails retain the existing immediate best-effort delivery flow;
  card booking emails retain their existing retryable outbox/idempotency keys.
- Browser previews and regression tests do not certify rendering in every
  Gmail/Outlook/Apple Mail version or delivery/anti-spam behaviour.

Rendering is centralised in [the shared templates](../lib/email-templates.ts);
transport and Reply-To/idempotency are in [the email provider](../lib/email.ts).
