// File: app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "sonner";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { TopContactBar } from "@/components/top-contact-bar";
import { Analytics } from "@vercel/analytics/react";
import { db as prisma } from "@/lib/db";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { StoreSettingsData } from "@/app/actions/settings";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  let settings = null;
  try {
    settings = await prisma.storeSettings.findFirst();
  } catch (error) {
    console.error("Error fetching settings in generateMetadata:", error);
  }
  const siteName = settings?.companyName || "Taxi Project - Premium Service in Larnaca";
  const siteDescription = settings?.heroSubtitle || "Reliable airport transfers & city rides. Professional drivers, fixed prices.";
  const faviconUrl = settings?.faviconUrl || "https://i.imgur.com/udCYp7c.png";
  const ogImageUrl = settings?.ogImageUrl || faviconUrl;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://taxi-project.vercel.app";

  return {
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description: siteDescription,
    icons: {
      icon: faviconUrl,
    },
    openGraph: {
      type: "website",
      locale: settings?.siteLang === "ru" ? "ru_RU" : "en_US",
      url: siteUrl,
      title: siteName,
      description: siteDescription,
      images: [{ url: ogImageUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description: siteDescription,
      images: [ogImageUrl],
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let settings = null;
  try {
    settings = await prisma.storeSettings.findFirst();
  } catch (error) {
    console.error("Error fetching settings in RootLayout:", error);
  }
  const siteLang = settings?.siteLang || "en";

  return (
    <html lang={siteLang} suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          <SettingsProvider initialSettings={settings as unknown as StoreSettingsData}>
            <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
              <div className="flex flex-col min-h-screen bg-taxi-dark-navy text-white">
                <TopContactBar />
                <Navbar />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
              <WhatsAppButton />
              <Toaster />
            </ThemeProvider>
          </SettingsProvider>
        </SessionProvider>
        <CookieBanner />
        <Analytics />
      </body>
    </html>
  );
}
