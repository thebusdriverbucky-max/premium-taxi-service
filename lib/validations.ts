// File: lib/validations.ts

import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.coerce.number().positive("Price must be positive"),
  category: z.string().min(1, "Category is required"),
  stock: z.coerce.number().nonnegative("Stock cannot be negative"),
  image: z.string().url("Invalid image URL"),
  images: z.array(z.string().url("Invalid image URL")).default([]),
  featured: z.boolean().default(false),
});

export const addressSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string()
    .min(5, "Phone number is too short")
    .max(25, "Phone number is too long")
    .regex(/^[\+]?[\d\s\-\(\)]{5,25}$/, "Invalid phone number format"),
  street: z.string().min(1, "Street is required"),
  city: z.string()
    .max(100, "City name is too long")
    .default("N/A"),
  state: z.string().default(""),
  postalCode: z.string()
    .max(15)
    .default("0000"),
  country: z.string().default("N/A"),
  isDefault: z.boolean().default(false),
}).superRefine((data, ctx) => {
  const stateRequiredCountries = ['US', 'CA', 'AU', 'IN'];
  if (stateRequiredCountries.includes(data.country) && !data.state?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'State/Province is required', path: ['state'] });
  }
});

export const checkoutSchema = z.object({
  shippingAddressId: z.string(),
  billingAddressId: z.string(),
  promoCode: z.string().optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const orderItemSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().positive().min(1).max(100),
  price: z.number().positive(),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1).max(50),
  total: z.number().positive().max(1000000), // Максимальная сумма заказа 1,000,000
  shippingAddress: addressSchema.optional(),
  guestEmail: z.string().email().optional(),
  // Taxi specific fields
  pickupAddress: z.string().optional(),
  dropoffAddress: z.string().optional(),
  pickupDateTime: z.string().optional(),
  passengerCount: z.number().int().positive().optional(),
  flightNumber: z.string().optional(),
  notes: z.string().optional(),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(["STRIPE", "CARD", "CASH"]).default("STRIPE"),
});

const coordinateSchema = z.number().finite();

export const bookingRoutePointSchema = z.object({
  address: z.string().trim().min(3).max(500),
  placeId: z.string().trim().min(1).max(255).optional(),
  latitude: coordinateSchema.min(-90).max(90),
  longitude: coordinateSchema.min(-180).max(180),
}).strict();

export const bookingPassengerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.preprocess(
    value => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().email().max(254).transform(value => value.toLowerCase()).optional(),
  ),
  phone: z.string()
    .trim()
    .min(5)
    .max(25)
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
  pickupDateTime: z.string().datetime({ offset: true }),
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
