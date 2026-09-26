'use server';

import { db as prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/require-admin';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export interface ContentPageData {
  slug: string;
  title: string;
  content: string;
}

const contentPageSchema = z.object({
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(100000),
}).strict();

const contentPageUpdateSchema = contentPageSchema.partial().refine(
  data => Object.keys(data).length > 0,
  { message: 'At least one field is required' },
);

export async function getPages() {
  try {
    await requireAdmin();
    const pages = await prisma.contentPage.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: pages };
  } catch (error) {
    console.error('Error fetching pages:', error);
    return { success: false, error: 'Failed to fetch pages' };
  }
}

export async function getPageBySlug(slug: string) {
  try {
    const validatedSlug = contentPageSchema.shape.slug.parse(slug);
    const page = await prisma.contentPage.findUnique({
      where: { slug: validatedSlug, isVisible: true },
    });
    return { success: true, data: page };
  } catch (error) {
    console.error('Error fetching page:', error);
    return { success: false, error: 'Failed to fetch page' };
  }
}

export async function updatePage(id: string, data: Partial<ContentPageData>) {
  try {
    await requireAdmin();
    const validatedId = z.string().cuid().parse(id);
    const validatedData = contentPageUpdateSchema.parse(data);
    await prisma.contentPage.update({
      where: { id: validatedId },
      data: validatedData,
    });
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Error updating page:', error);
    return { success: false, error: 'Failed to update page' };
  }
}

export async function togglePageVisibility(id: string, isVisible: boolean) {
  try {
    await requireAdmin();
    const validatedId = z.string().cuid().parse(id);
    const validatedVisibility = z.boolean().parse(isVisible);
    await prisma.contentPage.update({
      where: { id: validatedId },
      data: { isVisible: validatedVisibility },
    });
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Error toggling page visibility:', error);
    return { success: false, error: 'Failed to toggle page visibility' };
  }
}

export async function createPage(data: ContentPageData) {
  try {
    await requireAdmin();
    const validatedData = contentPageSchema.parse(data);
    await prisma.contentPage.create({
      data: {
        ...validatedData,
        isVisible: true,
      },
    });
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Error creating page:', error);
    return { success: false, error: 'Failed to create page' };
  }
}

export async function createMissingCMSPages() {
  try {
    await requireAdmin();
  } catch (error) {
    console.error('Unauthorized CMS initialization attempt:', error);
    return { success: false, error: 'Failed to create missing pages' };
  }

  const pages = [
    {
      slug: "about",
      title: "About Us",
      content: `Our Story
Founded with a commitment to providing safe, reliable, and comfortable transportation, our taxi service has been serving the community with pride. We believe in punctuality, transparency, and customer satisfaction.

What started as a small fleet has grown into a trusted transportation network. We are committed to continuous improvement, ensuring every ride is a premium experience.

Our Mission
To make transportation seamless, safe, and enjoyable for everyone. We strive to offer:
• Professional Drivers: Fully licensed and experienced
• Premium Fleet: Clean, well-maintained vehicles
• Punctuality: On-time pickups and efficient routes
• 24/7 Support: Always available when you need us

Our Values
Safety First: Your well-being is our top priority on every journey.
Excellence: We strive for excellence in everything we do, from vehicle maintenance to customer service.
Reliability: You can count on us to be there when you need a ride.
Community: We value our passengers and aim to be a positive force in our city.`,
    },
    {
      slug: "faq",
      title: "Frequently Asked Questions",
      content: `Q: How can I book a ride?
A: You can book a ride directly through our website by entering your pickup and dropoff locations, selecting your vehicle type, and choosing a time.

Q: What payment methods do you accept?
A: We accept all major credit cards (Visa, Mastercard, American Express), Apple Pay, and Google Pay through our secure Stripe payment processor. You can also pay by cash directly to the driver if selected during booking.

Q: Can I schedule a ride in advance?
A: Yes, you can schedule a ride days or even weeks in advance. Just select your desired date and time during the booking process.

Q: Are your drivers licensed and insured?
A: Absolutely. All our drivers undergo rigorous background checks, are fully licensed, and our fleet is comprehensively insured.

Q: Do you offer airport transfers?
A: Yes, airport transfers are one of our specialties. You can provide your flight number during booking so we can track your arrival time.

Q: Can I cancel or modify my booking?
A: You can cancel or modify your booking up to 2 hours before the scheduled pickup time without any penalty.

Q: Do you provide child seats?
A: Yes, child seats are available upon request. Please select this option under "Extras" when making your booking.`,
    },
    {
      slug: "terms",
      title: "Terms of Service",
      content: "Replace this starter text with terms reviewed for your business, location, booking, cancellation, and payment policies before launch.",
    },
    {
      slug: "privacy",
      title: "Privacy Policy",
      content: "Replace this starter text with a privacy policy reviewed for the personal, route, booking, analytics, and payment data your business processes before launch.",
    },
    {
      slug: "cookies",
      title: "Cookie Policy",
      content: "Replace this starter text with a cookie policy that reflects the analytics, maps, authentication, payment, and other services enabled on your deployment.",
    },
    {
      slug: "contact",
      title: "Contact Us",
      content: `Need a ride or have a question? We're here to help 24/7.

Email: info@taxiexample.com
Phone: +1 (555) 123-4567
Operations: 24 hours a day, 7 days a week
Support Response Time: Within 2 hours for urgent inquiries`,
    },
  ];

  try {
    for (const page of pages) {
      await prisma.contentPage.upsert({
        where: { slug: page.slug },
        update: {},
        create: {
          ...page,
          isVisible: true,
        },
      });
    }
    return { success: true };
  } catch (error) {
    console.error('Error creating missing CMS pages:', error);
    return { success: false, error: 'Failed to create missing CMS pages' };
  }
}
