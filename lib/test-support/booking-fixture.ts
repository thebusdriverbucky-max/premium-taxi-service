import * as location from '../booking-location';
export const validBooking = () => ({
  bookingRequestId: 'de305d54-75b4-431b-adb2-eb6b9e546014', tariffPlanId: 'c1234567890123456789012345',
  pickup: location.selectedLocation('Famagusta Cyprus', 35.12, 33.94, 'pickup-place')!,
  dropoff: location.selectedLocation('Ayia Napa Cyprus', 34.99, 34, 'dropoff-place')!,
  pickupDateTime: new Date(Date.now() + 86400000).toISOString(),
  passenger: { name: 'Customer', email: '', phone: '+357 12345678', count: 1 },
  paymentMethod: 'CASH',
});
