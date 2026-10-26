import assert from 'node:assert/strict';
import test from 'node:test';
import * as zod from 'zod';
import * as prismaClient from '@prisma/client';
import * as validation from './validations';
import * as errors from './validation-errors';
import * as pricing from './pricing';
import * as tripSettlement from './trip-settlement';
import { loadIsolated } from './test-support/load-isolated';

function tripsApi(options: { admin?: boolean; total?: number } = {}) {
  const calls = { findMany: [] as any[], count: [] as any[] };
  const route = loadIsolated('app/api/trips/route.ts', {
    '@/lib/auth': { auth: async () => (options.admin === false ? null : { user: { id: 'admin-1', role: 'ADMIN' } }) },
    '@/lib/rate-limit': { checkRateLimit: async () => ({ success: true }) },
    '@/lib/db': { db: {
      $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
      trip: {
        findMany: async (args: any) => { calls.findMany.push(args); return [{ id: 'trip-1' }]; },
        count: async (args: any) => { calls.count.push(args); return options.total ?? 120; },
      },
    } },
    '@/lib/stripe': {}, '@/lib/order-number': {}, '@/lib/email': {}, '@/lib/google-routes': { RouteCalculationError: class extends Error {} },
    'next/server': { NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) } },
    '@/lib/validations': validation, '@/lib/validation-errors': errors, '@/lib/pricing': pricing,
    '@/lib/trip-settlement': tripSettlement, '@prisma/client': prismaClient, zod,
  });
  return { calls, get: (query = '') => route.GET({ nextUrl: { searchParams: new URLSearchParams(query) } }) };
}

test('admin trips list defaults to the first page of 50, newest first, and reports server totals', async () => {
  const api = tripsApi({ total: 120 });
  const response = await api.get();
  assert.equal(response.status, 200);
  assert.equal(JSON.stringify(response.body), JSON.stringify({ trips: [{ id: 'trip-1' }], total: 120, page: 1, pageSize: 50, totalPages: 3 }));
  const [query] = api.calls.findMany;
  assert.equal(query.skip, 0);
  assert.equal(query.take, 50);
  assert.equal(JSON.stringify(query.where), '{}');
  assert.equal(JSON.stringify(query.orderBy), JSON.stringify([{ createdAt: 'desc' }, { id: 'desc' }]));
  assert.equal(JSON.stringify(api.calls.count[0].where), '{}');
});

test('admin trips list pages and filters by status on the server', async () => {
  const api = tripsApi({ total: 7 });
  const response = await api.get('page=3&pageSize=2&status=CONFIRMED');
  assert.equal(response.status, 200);
  assert.equal(response.body.page, 3);
  assert.equal(response.body.pageSize, 2);
  assert.equal(response.body.totalPages, 4);
  assert.equal(api.calls.findMany[0].skip, 4);
  assert.equal(api.calls.findMany[0].take, 2);
  assert.equal(api.calls.findMany[0].where.status, 'CONFIRMED');
  assert.equal(api.calls.count[0].where.status, 'CONFIRMED');
});

test('admin trips list rejects invalid paging or status with 400 before querying', async () => {
  for (const query of ['page=0', 'page=abc', 'pageSize=101', 'pageSize=0', 'page=1.5', 'status=BOGUS', 'status=all']) {
    const api = tripsApi();
    assert.equal((await api.get(query)).status, 400, query);
    assert.equal(api.calls.findMany.length, 0);
  }
});

test('admin trips list stays admin only', async () => {
  const api = tripsApi({ admin: false });
  assert.equal((await api.get()).status, 401);
  assert.equal(api.calls.findMany.length, 0);
});
