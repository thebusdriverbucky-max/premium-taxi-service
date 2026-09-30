import assert from 'node:assert/strict';
import test from 'node:test';
import * as jsx from 'react/jsx-runtime';
import { latestRequest } from './latest-request';
import * as location from './booking-location';
import { bookingDraftSchema } from './booking-draft';
import { createBookingSchema } from './validations';
import { validationFieldErrors } from './validation-errors';
import { loadIsolated } from './test-support/load-isolated';

import { validBooking } from './test-support/booking-fixture';

test('late prediction/details callbacks cannot replace newer selections or edits/unmounts', () => {
  const requests = latestRequest();
  let visible = '';
  const old = requests.start();
  const current = requests.start();
  current(() => { visible = 'Ayia Napa'; });
  old(() => { visible = 'France'; });
  assert.equal(visible, 'Ayia Napa');
  const pending = requests.start();
  requests.cancel();
  pending(() => { visible = 'Turkey'; });
  assert.equal(visible, 'Ayia Napa');
});

test('address edits invalidate coordinates/IDs; legacy or mismatched drafts cannot provide a route', () => {
  const selected = location.selectedLocation('Famagusta', 35.12, 33.94, 'place')!;
  assert.equal(location.selectedLocation('Famagusta edited'), null);
  assert.notEqual(location.routeKey(selected, selected), location.routeKey(null, selected));
  assert.equal(location.selectedLocation('Bad', 100, 5), null);
  assert.equal(location.selectedLocation('Bad', NaN, 5), null);
  assert.equal(location.restoreDraftLocation(undefined, 'Famagusta', { lat: 45, lng: 5 }), null);
  assert.equal(location.restoreDraftLocation(2, 'Famagusta', { address: 'Paris', lat: 45, lng: 5 }), null);
  assert.deepEqual(location.restoreDraftLocation(2, 'Famagusta', { address: 'Famagusta', lat: 35.12, lng: 33.94, placeId: 'place' }), selected);
});

test('booking date, invalid email/phone, identical endpoints and missing short-form selections produce field messages', () => {
  assert.equal(createBookingSchema.safeParse(validBooking()).success, true);
  const past = createBookingSchema.safeParse({ ...validBooking(), pickupDateTime: '2000-01-01T00:00:00Z', passenger: { name: '', phone: 'bad', email: 'bad', count: 1 } });
  assert.equal(past.success, false);
  if (!past.success) {
    const errors = validationFieldErrors(past.error.issues);
    assert.match(errors.pickupDateTime, /future/);
    for (const field of ['passenger.name', 'passenger.email', 'passenger.phone']) assert.ok(errors[field]);
  }
  const same = validBooking(); same.dropoff = same.pickup;
  assert.equal(createBookingSchema.safeParse(same).success, false);
  const draft = bookingDraftSchema.safeParse({ pickup: 'City', dropoff: 'Other', date: '2000-01-01T00:00', phone: 'bad' });
  assert.equal(draft.success, false);
  if (!draft.success) {
    const errors = validationFieldErrors(draft.error.issues);
    assert.ok(errors.pickupCoords); assert.ok(errors.dropoffCoords); assert.match(errors.date, /future/);
  }
});

test('actual map effect routes coordinates (not strings), ignores obsolete responses and reports failures', () => {
  const effects: Array<() => void | (() => void)> = [];
  const callbacks: any[] = [];
  const requests: any[] = [];
  const states: any[] = [];
  const commits: any[] = [];
  const map = loadIsolated('components/booking-map.tsx', {
    react: {
      useState: () => [null, (value: any) => states.push(value)],
      useEffect: (fn: any) => effects.push(fn), useCallback: (fn: any) => fn, useMemo: (fn: any) => fn(),
    }, 'react/jsx-runtime': jsx,
    '@react-google-maps/api': { useJsApiLoader: () => ({ isLoaded: true }), GoogleMap: 'map', DirectionsRenderer: 'route' },
    'lucide-react': { Loader2: 'loader' }, '@/lib/latest-request': { latestRequest },
  }, {
    google: { maps: { TravelMode: { DRIVING: 'DRIVING' }, DirectionsService: class {
      route(request: any, callback: any) { requests.push(request); callbacks.push(callback); }
    } } },
  });
  const booking = validBooking();
  const render = () => map.default({ pickup: booking.pickup, dropoff: booking.dropoff, onRouteChange: (...args: any[]) => commits.push(args) });
  render();
  const cleanup = effects.pop()!();
  assert.equal(requests[0].origin.lat, booking.pickup.latitude);
  assert.equal(requests[0].destination.lng, booking.dropoff.longitude);
  if (cleanup) cleanup();
  render(); effects.pop()!();
  const result = { routes: [{ legs: [{ distance: { value: 10000 }, duration: { value: 600 } }] }] };
  callbacks[1](result, 'OK');
  callbacks[0]({ routes: [] }, 'OK');
  assert.equal(commits.length, 1);
  assert.equal(commits[0][0].distanceMeters, 10000);
  callbacks[1](null, 'ZERO_RESULTS');
  assert.equal(commits[1][0], null);
  assert.match(commits[1][1], /No driving route/);
  assert.equal(states.at(-1), null);
});

test('actual autocomplete discards delayed details after typing and mismatched place IDs', () => {
  const refs: any[] = [];
  const state: any[] = [];
  let cursor = 0;
  let value = 'Famagusta';
  const changes: any[] = [];
  const detailCallbacks: any[] = [];
  const suggestion = { place_id: 'famagusta-id', description: 'Famagusta Cyprus', structured_formatting: { main_text: 'Famagusta' } };
  const component = loadIsolated('components/location-autocomplete.tsx', {
    react: {
      useId: () => 'input',
      useRef: (initial: any) => { const index = cursor++; return refs[index] ??= { current: initial }; },
      useState: (initial: any) => {
        const index = cursor++;
        if (!(index in state)) state[index] = initial;
        // Suggestions are supplied by the mocked prediction provider for this test.
        if (Array.isArray(initial)) state[index] = [suggestion];
        return [state[index], (next: any) => { state[index] = next; }];
      },
      useEffect() {},
    },
    'react/jsx-runtime': jsx,
    '@react-google-maps/api': { useJsApiLoader: () => ({ isLoaded: true }) },
    'lucide-react': { Loader2: 'loader' },
    '@/lib/latest-request': { latestRequest }, '@/lib/booking-location': location,
  }, {
    document: { createElement: () => ({}) },
    google: { maps: { places: { PlacesService: class {
      getDetails(_request: any, callback: any) { detailCallbacks.push(callback); }
    } } } },
  });
  function find(tree: any, type: string): any {
    if (Array.isArray(tree)) return tree.map(node => find(node, type)).find(Boolean);
    if (!tree || typeof tree !== 'object') return;
    if (tree.type === type) return tree;
    return find(tree.props?.children, type);
  }
  const render = () => {
    cursor = 0;
    return component.default({ label: 'Pickup', value, onChange: (...args: any[]) => { changes.push(args); value = args[0]; } });
  };
  const select = (tree: any) => find(tree, 'input').props.onKeyDown({ key: 'Enter', preventDefault() {} });
  select(render());
  assert.deepEqual(changes.at(-1), ['Famagusta Cyprus']); // old coordinates cleared immediately
  const input = find(render(), 'input');
  input.props.onChange({ target: { value: 'Ayia Napa' } });
  const point = { place_id: 'famagusta-id', formatted_address: 'Famagusta Cyprus', geometry: { location: { lat: () => 35.12, lng: () => 33.94 } } };
  detailCallbacks[0](point, 'OK');
  assert.deepEqual(changes.at(-1), ['Ayia Napa']); // late details did not restore Famagusta
  select(render());
  detailCallbacks[1]({ ...point, place_id: 'different-id' }, 'OK');
  assert.equal(changes.at(-1).length, 1); // mismatched ID cannot supply coordinates
  select(render());
  detailCallbacks[2](point, 'OK');
  assert.deepEqual(changes.at(-1), ['Famagusta Cyprus', 35.12, 33.94, 'famagusta-id']);
});
