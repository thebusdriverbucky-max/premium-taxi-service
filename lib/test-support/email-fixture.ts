import type { TripEmailData } from '../email-templates';

// Fictional data only. Shared by tests and the offline preview generator.
export function emailTripFixture(overrides: Partial<TripEmailData> = {}): TripEmailData {
  return {
    id: 'trip-preview-000042',
    tripNumber: 'TRP-2026-0042',
    status: 'PENDING',
    customerName: 'Alex Morgan',
    customerEmail: 'alex@example.test',
    customerPhone: '+357 00000000',
    pickupLocation: 'Example Airport — Arrivals hall',
    dropoffLocation: 'Example Hotel, City Centre',
    pickupDate: '2026-10-20T14:30:00Z',
    passengers: 3,
    tariffName: 'Business Sedan',
    price: 75.5,
    currency: 'EUR',
    paymentMethod: 'CASH',
    paymentStatus: 'PENDING',
    flightNumber: 'EX 204',
    extras: { luggage: { quantity: 2, size: 'Large' }, childSeats: { quantity: 1 } },
    notes: 'Please meet us in the arrivals hall.\nWe are travelling with a child.',
    discountAmount: 5,
    supportEmail: 'office@example.test',
    distance: '42.3 km',
    duration: '38 min',
    ...overrides,
  };
}
