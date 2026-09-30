import { z } from 'zod';

export const cmsSlugs = ['about', 'contact', 'faq', 'terms', 'privacy', 'cookies'] as const;

export const contentPageSchema = z.object({
  slug: z.enum(cmsSlugs),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(100000),
}).strict();

export const contentPageUpdateSchema = contentPageSchema.partial().refine(
  data => Object.keys(data).length > 0,
  { message: 'At least one field is required' },
);
