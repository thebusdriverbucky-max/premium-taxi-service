'use server';

import { db as prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export interface ContentPageData {
  slug: string;
  title: string;
  content: string;
}

export async function getPages() {
  try {
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
    const page = await prisma.contentPage.findUnique({
      where: { slug },
    });
    return { success: true, data: page };
  } catch (error) {
    console.error('Error fetching page:', error);
    return { success: false, error: 'Failed to fetch page' };
  }
}

export async function updatePage(id: string, data: Partial<ContentPageData>) {
  try {
    await prisma.contentPage.update({
      where: { id },
      data,
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
    await prisma.contentPage.update({
      where: { id },
      data: { isVisible },
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
    await prisma.contentPage.create({
      data: {
        ...data,
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

export async function seedCMSPages() {
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
      content: `Agreement to Terms
By accessing and using our booking platform, you accept and agree to be bound by the terms and provision of this agreement.

Service Provision
• We aim to provide reliable transportation services as booked.
• Drivers reserve the right to refuse service to passengers who exhibit unsafe or inappropriate behavior.
• Wait times may apply and could incur additional charges if they exceed the complimentary waiting period.

Booking and Cancellation
• Bookings must be made with accurate pickup and dropoff information.
• Cancellations made within 2 hours of the scheduled pickup time may be subject to a cancellation fee.

Limitation of Liability
In no event shall our company be liable for any indirect damages, or delays caused by traffic, weather conditions, or circumstances beyond our control.

Changes to Terms
We reserve the right to modify or amend these terms at any time. Your continued use of our service following the posting of revised Terms means that you accept and agree to the changes.`,
    },
    {
      slug: "privacy",
      title: "Privacy Policy",
      content: `Introduction
We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and protect your information when you use our taxi service.

Information We Collect
• Name, email address, and phone number (for account creation and booking)
• Pickup and dropoff locations (to provide the service)
• Payment information (processed securely by Stripe - we don't store it)
• Usage data (cookies, analytics)

How We Use Your Data
• Process and manage your bookings
• Communicate with you regarding your ride (e.g., driver arrival notifications)
• Improve our services and dispatch efficiency
• Comply with legal and regulatory obligations

Payment Security
Payment information is processed securely by Stripe. We do not store credit card information on our servers. All transactions are encrypted and PCI-DSS compliant.

Your Rights
You have the right to access, update, or request deletion of your personal data. You may also opt-out of promotional communications at any time.`,
    },
    {
      slug: "cookies",
      title: "Cookie Policy",
      content: `What Are Cookies?
Cookies are small text files that are stored on your computer or mobile device when you visit our website. They help us remember your preferences and understand how you use our site.

Types of Cookies We Use
Essential Cookies: Required for the website and booking system to function properly.
Analytics Cookies: Help us understand how visitors interact with our platform.
Preference Cookies: Remember your choices (such as language or previous locations).

Managing Cookies
You can control and manage cookies through your browser settings. Most browsers allow you to view, delete, or block cookies.

Third-Party Services
We use third-party services that may set their own cookies:
• Stripe: Payment processing and fraud prevention
• Google Maps: Location search and route calculation
• NextAuth: User authentication`,
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
    // Remove unwanted pages
    await prisma.contentPage.deleteMany({
      where: {
        slug: {
          in: ['shipping', 'careers', 'shipping-information']
        }
      }
    });

    for (const page of pages) {
      await prisma.contentPage.upsert({
        where: { slug: page.slug },
        update: {
          title: page.title,
          content: page.content,
        },
        create: {
          ...page,
          isVisible: true,
        },
      });
    }
    return { success: true };
  } catch (error) {
    console.error('Error seeding CMS pages:', error);
    return { success: false, error: 'Failed to seed CMS pages' };
  }
}
