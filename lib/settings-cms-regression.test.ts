import assert from 'node:assert/strict';
import test from 'node:test';
import * as zod from 'zod';
import * as emailTemplates from './email-templates';
import * as jsx from 'react/jsx-runtime';
import * as settingsValidation from './settings-validation';
import * as cmsValidation from './cms-validation';
import * as errors from './validation-errors';
import { loadIsolated } from './test-support/load-isolated';

const settings = { currency: ' eur ', taxRate: 0, enableCardPayment: false, enableCashPayment: true };

test('optional email: omission preserves, blank/null clears, valid trims, invalid rejects with field errors', () => {
  for (const storeEmail of ['', '   ', null]) assert.equal(settingsValidation.storeSettingsSchema.parse({ ...settings, storeEmail }).storeEmail, null);
  assert.equal(settingsValidation.storeSettingsSchema.parse(settings).storeEmail, undefined);
  assert.equal(settingsValidation.storeSettingsSchema.parse({ ...settings, storeEmail: ' support@example.com ' }).storeEmail, 'support@example.com');
  const invalid = settingsValidation.storeSettingsSchema.safeParse({ ...settings, storeEmail: 'wrong' });
  assert.equal(invalid.success, false);
  if (!invalid.success) assert.match(errors.validationFieldErrors(invalid.error.issues).storeEmail, /valid contact email/);
  assert.equal(settingsValidation.storeSettingsSchema.safeParse({ ...settings, taxRate: NaN }).success, false);
  assert.equal(settingsValidation.storeSettingsSchema.safeParse({ ...settings, enableCashPayment: false }).success, false);
  assert.equal(settingsValidation.storeSettingsSchema.safeParse({ ...settings, ignoredField: true }).success, false);
});

test('actual settings action saves normalized cash-only data, does not write invalid email, enforces merged flags', async () => {
  let saved: any;
  let writes = 0;
  let currencyWrites = 0;
  let existing: any = { id: 'settings', currency: 'USD', enableCashPayment: true, enableCardPayment: false };
  let admin = true;
  const tx = { storeSettings: {
    update: async ({ data }: any) => { saved = data; writes++; },
    create: async ({ data }: any) => { saved = data; writes++; },
  }, tariffPlan: { updateMany: async () => { currencyWrites++; } } };
  const action = loadIsolated('app/actions/settings.ts', {
    '@/lib/db': { db: { ...tx, storeSettings: { ...tx.storeSettings, findFirst: async () => existing }, $transaction: async (fn: any) => fn(tx) } },
    '@/lib/require-admin': { requireAdmin: async () => { if (!admin) throw new Error('Denied'); } },
    'next/cache': { revalidatePath() {} }, zod,
    '@/lib/settings-validation': settingsValidation, '@/lib/validation-errors': errors,
    '@/lib/stripe': { getStripeConfiguration: () => ({ configured: false, present: {} }) },
  });
  assert.equal((await action.updateSettings({ ...settings, storeEmail: '  ' })).success, true);
  assert.equal(saved.storeEmail, null);
  assert.equal(saved.currency, 'EUR');
  assert.equal(currencyWrites, 1);
  assert.match((await action.updateSettings({ ...settings, storeEmail: 'bad' })).fieldErrors.storeEmail, /valid contact email/);
  assert.equal(writes, 1);
  assert.equal((await action.updateSettings({ currency: 'EUR', taxRate: 0, enableCashPayment: false })).success, false);
  assert.equal(writes, 1);
  existing = null;
  assert.equal((await action.updateSettings(settings)).success, true);
  assert.equal(writes, 2);
  admin = false;
  assert.equal((await action.updateSettings(settings)).success, false);
  assert.equal(writes, 2);
});

test('CMS actions persist every supported page and reject unknown fields/slugs and URL renames', async () => {
  let page: any;
  let writes = 0;
  const action = loadIsolated('app/actions/cms.ts', {
    '@/lib/db': { db: { contentPage: {
      findUnique: async ({ where }: any) => where.isVisible && !page.isVisible ? null : page,
      update: async ({ data }: any) => { page = { ...page, ...data }; writes++; },
    } } },
    '@/lib/require-admin': { requireAdmin: async () => {} },
    'next/cache': { revalidatePath() {} }, zod,
    '@/lib/cms-validation': cmsValidation, '@/lib/validation-errors': errors,
  });
  for (const slug of cmsValidation.cmsSlugs) {
    page = { id: 'c1234567890123456789012345', slug, title: 'Old', content: 'Old', isVisible: true };
    assert.equal((await action.updatePage(page.id, { slug, title: `Title ${slug}`, content: `Text ${slug}` })).success, true);
    assert.equal((await action.getPageBySlug(slug)).data.content, `Text ${slug}`);
    page.isVisible = false;
    assert.equal((await action.getPageBySlug(slug)).data, null);
  }
  const count = writes;
  assert.equal((await action.updatePage(page.id, { content: 'Text', ignored: 'x' })).success, false);
  assert.equal((await action.updatePage(page.id, { slug: 'about' })).success, false);
  assert.equal((await action.updatePage(page.id, { slug: 'unknown' })).success, false);
  assert.equal(writes, count);
});

test('public CMS routes use the matching slug, Contact and FAQ expose saved title/content and hidden pages are not rendered', async () => {
  for (const slug of ['about', 'terms', 'privacy', 'cookies']) {
    const Component = () => null;
    const page = loadIsolated(`app/${slug}/page.tsx`, { 'react/jsx-runtime': jsx, '@/components/cms/content-page': { ContentPage: Component } });
    assert.equal(page.default().props.slug, slug);
  }
  for (const slug of ['contact', 'faq']) {
    let visible = true;
    const page = loadIsolated(`app/${slug}/page.tsx`, {
      'react/jsx-runtime': jsx,
      '@/app/actions/cms': { getPageBySlug: async (requested: string) => {
        assert.equal(requested, slug);
        return { success: true, data: visible ? { title: 'Saved title', content: 'Saved text' } : null };
      } },
      'next/navigation': { notFound() { throw new Error('404'); } },
      '@/components/cms/contact-content': { default: () => null, __esModule: true },
      '@/lib/db': { db: { faqItem: { findMany: async () => [] } } },
    });
    const tree = await page.default();
    assert.match(JSON.stringify(tree), /Saved title/);
    assert.match(JSON.stringify(tree), /Saved text/);
    visible = false;
    await assert.rejects(page.default(), /404/);
  }
  let visible = true;
  const content = loadIsolated('components/cms/content-page.tsx', {
    'react/jsx-runtime': jsx,
    '@/app/actions/cms': { getPageBySlug: async () => ({ success: true, data: visible ? { title: 'Legal', content: '<script>plain text</script>' } : null }) },
    'next/navigation': { notFound() { throw new Error('404'); } },
  });
  assert.match(JSON.stringify(await content.ContentPage({ slug: 'privacy', fallbackTitle: 'Privacy' })), /plain text/);
  visible = false;
  await assert.rejects(content.ContentPage({ slug: 'privacy', fallbackTitle: 'Privacy' }), /404/);
});

test('Contact recipient is settings first, private ADMIN_EMAIL fallback; missing/invalid recipient never pretends delivery', async () => {
  let storeEmail: string | null = 'public@example.com';
  const env: Record<string, string> = { ADMIN_EMAIL: 'private@example.com' };
  const recipients: string[] = [];
  const api = loadIsolated('app/api/contact/route.ts', {
    'next/server': { NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) } },
    '@/lib/email': { sendEmail: async ({ to }: any) => { recipients.push(to); return true; } },
    '@/lib/email-templates': emailTemplates,
    zod,
    '@/lib/rate-limit': { checkRateLimit: async () => ({ success: true }) },
    '@/lib/db': { db: { storeSettings: { findFirst: async () => ({ storeEmail }) } } },
  }, { process: { env } });
  const request = { headers: { get: () => null }, json: async () => ({ name: 'Customer', email: 'customer@example.com', subject: 'Question', message: 'Contact message with sufficient length' }) };
  assert.equal((await api.POST(request)).status, 200);
  assert.equal(recipients[0], 'public@example.com');
  recipients.length = 0;
  storeEmail = null;
  assert.equal((await api.POST(request)).status, 200);
  assert.equal(recipients[0], 'private@example.com');
  recipients.length = 0;
  delete env.ADMIN_EMAIL;
  assert.equal((await api.POST(request)).status, 503);
  assert.equal(recipients.length, 0);
  storeEmail = 'invalid';
  assert.equal((await api.POST(request)).status, 503);
  assert.equal(recipients.length, 0);
});
