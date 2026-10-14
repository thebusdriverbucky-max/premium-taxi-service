import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  buildAdminEmailHtml,
  buildCustomerEmailHtml,
  escapeEmailHtml,
  getAdminContactEmailHtml,
  getCustomerContactEmailHtml,
  getOrderStatusUpdateEmailHtml,
  getPasswordResetEmailHtml,
  getTripStatusLabel,
} from '../lib/email-templates';
import { emailTripFixture } from '../lib/test-support/email-fixture';

// No .env loading, DB access, provider imports or real emails. Links/data are fake.
process.env.NEXT_PUBLIC_APP_URL = 'https://taxi.example.test';
process.env.TZ = 'UTC';

async function main() {
  const output = resolve(process.cwd(), '.email-preview');
  await mkdir(output, { recursive: true });
  const company = 'Example Taxi';
  const cash = emailTripFixture();
  const card = emailTripFixture({ status: 'CONFIRMED', paymentMethod: 'STRIPE', paymentStatus: 'PAID' });
  const previews = [
    { file: 'admin-cash.html', title: 'Admin · cash booking', html: buildAdminEmailHtml(cash, company) },
    { file: 'admin-card.html', title: 'Admin · paid card booking', html: buildAdminEmailHtml(card, company) },
    { file: 'customer-cash.html', title: 'Customer · cash booking', html: buildCustomerEmailHtml(cash, company) },
    { file: 'customer-card.html', title: 'Customer · paid card booking', html: buildCustomerEmailHtml(card, company) },
    { file: 'customer-minimal.html', title: 'Customer · no optional services', html: buildCustomerEmailHtml(emailTripFixture({ extras: {}, notes: '', flightNumber: '', discountAmount: 0 }), company) },
    ...['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED'].map(status => ({
      file: `status-${status.toLowerCase()}.html`,
      title: `Customer · ${getTripStatusLabel(status)}`,
      html: getOrderStatusUpdateEmailHtml(cash.id, status, company, 'Alex Driver', {
        tripNumber: cash.tripNumber, driverPhone: '+357 00000000', supportEmail: cash.supportEmail,
        paymentStatus: status === 'REFUNDED' ? 'REFUNDED' : 'PAID', paymentMethod: 'STRIPE',
      }),
    })),
    { file: 'password-reset.html', title: 'Customer · password reset', html: getPasswordResetEmailHtml('https://taxi.example.test/reset-password?token=fictional-preview-token', company) },
    { file: 'contact-admin.html', title: 'Admin · contact message', html: getAdminContactEmailHtml(cash.customerName, cash.customerEmail, 'Pickup location question', 'Hello,\nCould you confirm where we should meet the driver?\nThank you!', company) },
    { file: 'contact-customer.html', title: 'Customer · message received', html: getCustomerContactEmailHtml(cash.customerName, 'Pickup location question', 'office@example.test', company) },
  ];
  for (const preview of previews) await writeFile(resolve(output, preview.file), preview.html, 'utf8');

  const gallery = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Taxi email previews</title>
<style>
  *{box-sizing:border-box}body{margin:0;background:#0B1019;color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;padding:28px 16px}main{max-width:760px;margin:auto}h1{color:#E5BC4B}p{color:#B4BFCE;line-height:1.6}nav{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0}nav a,.open{color:#E5BC4B}nav a{padding:8px 12px;border:1px solid #2C3747;border-radius:8px;text-decoration:none}section{margin:40px 0}h2{font-size:18px}iframe{display:block;width:100%;border:1px solid #2C3747;border-radius:12px;background:#0B1019;margin-top:16px}.mobile iframe{max-width:375px;margin-left:auto;margin-right:auto}button{padding:12px 18px;background:#D4AF37;color:#0B1019;border:0;border-radius:8px;font-weight:bold;cursor:pointer}
</style></head><body><main><h1>Taxi email previews</h1>
<p>Offline previews using fictional data only. No messages are sent. Browser rendering is not a substitute for testing Gmail, Outlook or Apple Mail.</p>
<button id="width-toggle" type="button">Switch to mobile width (375px)</button>
<nav>${previews.map((preview, index) => `<a href="#preview-${index}">${escapeEmailHtml(preview.title)}</a>`).join('')}</nav>
${previews.map((preview, index) => `<section id="preview-${index}"><h2>${escapeEmailHtml(preview.title)}</h2><a class="open" href="${preview.file}" target="_blank" rel="noopener">Open standalone email</a><iframe title="${escapeEmailHtml(preview.title)}" sandbox="allow-same-origin" srcdoc="${escapeEmailHtml(preview.html)}"></iframe></section>`).join('\n')}
</main><script>
  const frames = Array.from(document.querySelectorAll('iframe'));
  function fit(frame) { if (frame.contentDocument) frame.style.height = frame.contentDocument.documentElement.scrollHeight + 'px'; }
  frames.forEach(frame => frame.addEventListener('load', () => fit(frame)));
  document.getElementById('width-toggle').addEventListener('click', event => {
    const mobile = document.body.classList.toggle('mobile');
    event.target.textContent = mobile ? 'Switch to desktop width' : 'Switch to mobile width (375px)';
    requestAnimationFrame(() => frames.forEach(fit));
  });
  window.addEventListener('resize', () => frames.forEach(fit));
</script></body></html>`;
  await writeFile(resolve(output, 'index.html'), gallery, 'utf8');
  console.log(`Created ${previews.length} fictional email previews. Open .email-preview/index.html in a browser.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
