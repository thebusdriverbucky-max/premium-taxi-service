import { z } from 'zod';
import { bookingPassengerSchema } from './validations';

const coordinates = z.object({ lat: z.number().finite().min(-90).max(90), lng: z.number().finite().min(-180).max(180), placeId: z.string().optional() });
export const bookingDraftSchema = z.object({
  pickup: z.string().trim().min(2, 'Pickup location is required'),
  pickupCoords: coordinates,
  dropoff: z.string().trim().min(2, 'Dropoff location is required'),
  dropoffCoords: coordinates,
  date: z.string().min(1, 'Enter pickup date and time').refine(value => Date.parse(value) > Date.now(), 'Pickup date and time must be in the future'),
  phone: bookingPassengerSchema.shape.phone,
});
