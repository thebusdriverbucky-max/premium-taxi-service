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
