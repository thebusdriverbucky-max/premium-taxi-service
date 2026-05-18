"use client";

import { Plane, Car, Clock } from "lucide-react";
import { useSettings } from "@/components/providers/settings-provider";

export function Services() {
  const { settings } = useSettings();

  const services = [
    {
      icon: Plane,
      title: settings?.service1Title || "Airport Transfers",
      description: settings?.service1Text || "Seamless pickups and drop-offs at Larnaca International Airport. We track your flight to ensure we're there when you land."
    },
    {
      icon: Car,
      title: settings?.service2Title || "City Rides",
      description: settings?.service2Text || "Comfortable travel within Larnaca city. Whether it's for business, shopping, or dining, we get you there in style."
    },
    {
      icon: Clock,
      title: settings?.service3Title || "Hourly Service",
      description: settings?.service3Text || "Need a car for a few hours? Book our hourly service for flexible travel with a dedicated driver at your disposal."
    }
  ];

  return (
    <section className="py-28 relative overflow-hidden bg-taxi-dark-navy">
      {/* SVG Gradient Definition for Icons */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="gold-gradient-rtl" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#BF953F" />
            <stop offset="50%" stopColor="#FBF5B7" />
            <stop offset="100%" stopColor="#AA771C" />
          </linearGradient>
        </defs>
      </svg>

      {/* Gold overlay */}
      <div className="absolute inset-0 pointer-events-none bg-taxi-gold-DEFAULT/5" />

      <div className="container mx-auto px-4 relative z-10 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 inline-block bg-gradient-to-r from-[#FCF6BA] to-[#BF953F] bg-clip-text text-transparent">
          {settings?.servicesTitle || "Our Services"}
        </h2>
        <p className="text-gray-400 text-lg mt-4 mb-12">
          {settings?.servicesSubtitle || "Professional transfers tailored to your needs"}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div key={index} className="relative bg-taxi-dark-navy/50 backdrop-blur-md p-8 rounded-xl shadow-[0_0_25px_rgba(191,149,63,0.1)] hover:shadow-[0_0_40px_rgba(191,149,63,0.2)] transition-all border border-taxi-gold-DEFAULT/20 border-t-2 hover:border-t-taxi-gold-DEFAULT/70 transition-all duration-300 group flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-taxi-gold-light/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-taxi-gold-light/20 transition-colors">
                <service.icon className="w-8 h-8" stroke="url(#gold-gradient-rtl)" />
              </div>
              <h3 className="text-xl font-bold mb-4 inline-block bg-gradient-to-r from-[#FCF6BA] to-[#BF953F] bg-clip-text text-transparent">{service.title}</h3>
              <p className="text-gray-300 leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
