"use client";

import { Users } from "lucide-react";
import { useSettings } from "@/components/providers/settings-provider";

export function FamilyBusiness() {
  const { settings } = useSettings();

  const title = settings?.familyTitle || "A Family Tradition of Excellence";
  const text = settings?.familyText || "We are a family-owned business, time-tested and passed down through generations. Our commitment to reliability, safety, and personal service is deeply rooted in our family values. When you ride with us, you're not just a passenger; you're treated like family.";

  return (
    <section className="py-28 bg-taxi-dark-navy bg-luxury-pattern relative">
      {/* SVG Gradient Definition for Icons */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="gold-gradient-hero" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FCF6BA" />
            <stop offset="100%" stopColor="#BF953F" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 bg-taxi-dark-navy/90" /> {/* Overlay for pattern readability */}
      <div className="container mx-auto px-4 text-center relative z-10">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-gradient-to-b from-taxi-gold-light/20 to-transparent rounded-full">
            <Users className="w-12 h-12" stroke="url(#gold-gradient-hero)" />
          </div>
        </div>
        <h2 className="text-3xl md:text-5xl font-bold mb-6 inline-block bg-gradient-to-r from-[#FCF6BA] to-[#BF953F] bg-clip-text text-transparent">
          {title}
        </h2>

        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-taxi-gold-DEFAULT"></div>
          <div className="w-2 h-2 rotate-45 bg-taxi-gold-DEFAULT"></div>
          <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-taxi-gold-DEFAULT"></div>
        </div>

        <p className="text-lg md:text-xl text-white max-w-3xl mx-auto leading-relaxed">
          {text}
        </p>
      </div>
    </section>
  );
}
