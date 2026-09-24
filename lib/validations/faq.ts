import { z } from "zod";

export const faqSchema = z.object({
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(10000),
  category: z.string().trim().min(1).max(100).nullable().optional(),
  sortOrder: z.number().int().min(-100000).max(100000).optional(),
  isVisible: z.boolean().optional(),
}).strict();

export const faqUpdateSchema = faqSchema.partial().refine(
  data => Object.keys(data).length > 0,
  { message: "At least one field is required" },
);

export const faqIdSchema = z.string().cuid();
