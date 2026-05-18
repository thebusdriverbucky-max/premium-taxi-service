"use client";

import { ShieldCheck, Banknote, Clock, Star } from "lucide-react";
import { useSettings } from "@/components/providers/settings-provider";

export function Features() {
  const { settings } = useSettings();

  const features = [
    {
      icon: ShieldCheck,
      title: settings?.feature1Title || "Professional Drivers",
      description: settings?.feature1Text || "Our team consists of fully licensed, highly experienced, and courteous drivers who prioritize your safety and comfort above all else. They know the island inside out."
    },
    {
      icon: Banknote,
      title: settings?.feature2Title || "Fixed Prices",
      description: settings?.feature2Text || "Enjoy complete transparency with our fixed pricing model. The price you see is the price you pay, with absolutely no hidden fees, surcharges, or unexpected costs."
    },
    {
      icon: Clock,
      title: settings?.feature3Title || "24/7 Availability",
      description: settings?.feature3Text || "We are at your service around the clock, 365 days a year. Whether you have an early morning flight or a late-night arrival, you can count on us to be there on time."
    },
    {
      icon: Star,
      title: settings?.feature4Title || "Luxury Vehicles",
      description: settings?.feature4Text || "Travel in style and comfort with our fleet of modern, meticulously maintained, and clean vehicles. We offer a premium travel experience that meets the highest standards."
    }
  ];

  return (
    <section className="py-28 text-white bg-taxi-dark-navy">
      {/* SVG Gradient Definition for Icons */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="gold-gradient-edge" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#BF953F" />
            <stop offset="50%" stopColor="#FBF5B7" />
            <stop offset="100%" stopColor="#AA771C" />
          </linearGradient>
        </defs>
      </svg>

      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 inline-block bg-gradient-to-r from-[#BF953F] to-[#FCF6BA] bg-clip-text text-transparent">
            {settings?.featuresTitle || "Why Choose Us"}
          </h2>
          <p className="text-xl text-white">
            {settings?.featuresSubtitle || "Experience the difference with our premium service"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="text-center p-8 rounded-xl transition-all bg-taxi-dark-navy/40 border border-taxi-gold-DEFAULT/20 shadow-[0_0_20px_rgba(191,149,63,0.1)] hover:border-taxi-gold-DEFAULT/50 hover:shadow-[0_0_30px_rgba(191,149,63,0.2)]"
            >
              <div className="relative w-12 h-12 mx-auto mb-4">
                <div className="absolute inset-0 bg-taxi-gold-DEFAULT/20 rounded-full blur-md scale-150" />
                <feature.icon className="relative w-full h-full" stroke="url(#gold-gradient-edge)" />
              </div>
              <h3 className="text-xl font-bold mb-3 inline-block bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#AA771C] bg-clip-text text-transparent">{feature.title}</h3>
              <p className="text-white leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
