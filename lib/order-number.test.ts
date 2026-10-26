import assert from 'node:assert/strict';
import test from 'node:test';
import { loadIsolated } from './test-support/load-isolated';

function orderNumbers(counterValue: number, now = '2026-12-31T23:30:00.000Z') {
  const queries: { sql: string; values: unknown[] }[] = [];
  class FixedDate extends Date {
    constructor(...args: [] | [string | number | Date]) { super(...(args.length ? args : [now] as [string])); }
  }
  const { generateOrderNumber } = loadIsolated('lib/order-number.ts', {
    '@/lib/db': { db: { $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      queries.push({ sql: strings.join('?'), values });
      return [{ value: counterValue }];
    } } },
  }, { Date: FixedDate });
  return { queries, generate: generateOrderNumber as () => Promise<string> };
}

test('order numbers come from one atomic per-year counter upsert using the UTC year', async () => {
  const { queries, generate } = orderNumbers(42);
  assert.equal(await generate(), '#2026-000042');
  assert.equal(queries.length, 1);
  assert.deepEqual(queries[0].values, [2026]);
  assert.match(queries[0].sql, /INSERT INTO "TripNumberCounter"/);
  assert.match(queries[0].sql, /ON CONFLICT \("year"\) DO UPDATE/);
  assert.match(queries[0].sql, /"TripNumberCounter"\."value" \+ 1/);
  assert.match(queries[0].sql, /RETURNING "value"/);
});

test('order numbers are padded to six digits and grow past them without truncation', async () => {
  assert.equal(await orderNumbers(1).generate(), '#2026-000001');
  assert.equal(await orderNumbers(1_234_567).generate(), '#2026-1234567');
});

test('the counter year follows UTC, not the server time zone', async () => {
  const { generate, queries } = orderNumbers(7, '2027-01-01T00:30:00.000+02:00');
  assert.equal(await generate(), '#2026-000007');
  assert.deepEqual(queries[0].values, [2026]);
});
