// File: lib/validations.ts

import { z } from "zod";

const coordinateSchema = z.number().finite();

export const bookingRoutePointSchema = z.object({
  address: z.string().trim().min(3).max(500),
  placeId: z.string().trim().min(1).max(255).optional(),
  latitude: coordinateSchema.min(-90).max(90),
  longitude: coordinateSchema.min(-180).max(180),
}).strict();

export const bookingPassengerSchema = z.object({
  name: z.string().trim().min(2, "Enter a name with at least 2 characters").max(120),
  email: z.preprocess(
    value => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().email("Enter a valid email address or leave it blank").max(254).transform(value => value.toLowerCase()).optional(),
  ),
  phone: z.string()
    .trim()
    .min(5, "Enter a phone number with at least 5 characters")
    .max(25, "Phone number must contain at most 25 characters")
    .regex(/^\+?[\d\s\-()]{5,25}$/, "Invalid phone number format"),
  count: z.number().int().min(1).max(50),
}).strict();

export const bookingExtrasSchema = z.object({
  luggage: z.object({
    quantity: z.number().int().min(1).max(20),
    size: z.enum(["Standard", "Large"]),
  }).strict().optional(),
  childSeats: z.object({
    quantity: z.number().int().min(1).max(10),
  }).strict().optional(),
}).strict();

export const createBookingSchema = z.object({
  bookingRequestId: z.string().uuid(),
  tariffPlanId: z.string().cuid(),
  pickup: bookingRoutePointSchema,
  dropoff: bookingRoutePointSchema,
  pickupDateTime: z.string().datetime({ offset: true, message: "Enter a valid pickup date and time" }).refine(
    value => Date.parse(value) > Date.now(), "Pickup date and time must be in the future",
  ),
  passenger: bookingPassengerSchema,
  extras: bookingExtrasSchema.default({}),
  flightNumber: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(2000).optional(),
  couponCode: z.string().trim().min(1).max(100).transform(value => value.toUpperCase()).optional(),
  paymentMethod: z.enum(["STRIPE", "CASH"]),
}).strict().superRefine((data, ctx) => {
  if (data.pickup.latitude === data.dropoff.latitude &&
      data.pickup.longitude === data.dropoff.longitude) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Pickup and dropoff locations must be different",
      path: ["dropoff"],
    });
  }
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
