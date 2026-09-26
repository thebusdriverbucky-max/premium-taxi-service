import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const DEFAULT_SETTINGS_ID = "ctaxisettings000000000000";
const DEFAULT_FAQ_ID = "ctaxifaq00000000000000000";

const requiredPages = [
  {
    slug: "about",
    title: "About Us",
    content:
      "Tell customers about your taxi business, service area, drivers, and commitment to safe, reliable transportation.",
  },
  {
    slug: "terms",
    title: "Terms of Service",
    content:
      "Replace this starter text with terms reviewed for your business, location, booking, cancellation, and payment policies before launch.",
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    content:
      "Replace this starter text with a privacy policy reviewed for the personal, route, booking, analytics, and payment data your business processes before launch.",
  },
  {
    slug: "cookies",
    title: "Cookie Policy",
    content:
      "Replace this starter text with a cookie policy that reflects the analytics, maps, authentication, payment, and other services enabled on your deployment.",
  },
  {
    slug: "contact",
    title: "Contact Us",
    content:
      "Add your dispatch phone number, support email, service area, and operating hours here before launch.",
  },
];

async function main() {
  console.log("Bootstrapping required taxi data...");

  const existingSettings = await db.storeSettings.findFirst({
    select: { id: true },
  });

  if (!existingSettings) {
    await db.storeSettings.upsert({
      where: { id: DEFAULT_SETTINGS_ID },
      update: {},
      create: {
        id: DEFAULT_SETTINGS_ID,
        companyName: "Taxi Service",
        currency: "EUR",
        taxRate: 0,
        enableCardPayment: true,
        enableCashPayment: true,
      },
    });
    console.log("Created default store settings.");
  } else {
    console.log("Store settings already exist; leaving them unchanged.");
  }

  for (const page of requiredPages) {
    await db.contentPage.upsert({
      where: { slug: page.slug },
      update: {},
      create: { ...page, isVisible: true },
    });
  }

  const visibleFaq = await db.faqItem.findFirst({
    where: { isVisible: true },
    select: { id: true },
  });

  if (!visibleFaq) {
    await db.faqItem.upsert({
      where: { id: DEFAULT_FAQ_ID },
      update: {},
      create: {
        id: DEFAULT_FAQ_ID,
        question: "How do I book a ride?",
        answer:
          "Choose your pickup and destination on the booking page, select a tariff and payment method, then confirm the trip.",
        category: "Booking",
        sortOrder: 0,
        isVisible: true,
      },
    });
  }

  const activeTariff = await db.tariffPlan.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  if (!activeTariff) {
    await db.tariffPlan.upsert({
      where: { slug: "standard" },
      update: {},
      create: {
        name: "Standard",
        slug: "standard",
        description:
          "Starter tariff. Review every price and limit before accepting real bookings.",
        basePrice: 5,
        pricePerKm: 1.5,
        pricePerMin: 0,
        minPrice: 10,
        currency: "EUR",
        vehicleType: "Sedan",
        maxPassengers: 4,
        maxLuggage: 2,
        features: ["Professional driver", "Up to 4 passengers"],
        isActive: true,
        isFeatured: true,
        sortOrder: 0,
      },
    });
  }

  console.log(
    "Required taxi data is ready. Existing owner data was not changed.",
  );
}

main()
  .catch((error) => {
    console.error("Database bootstrap error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
