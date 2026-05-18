"use client";

import { Button } from "@/components/ui/Button";
import { useSettings } from "@/components/providers/settings-provider";
import { ArrowRight } from "lucide-react";

export function Hero() {
  const { settings } = useSettings();

  const scrollToBooking = () => {
    const element = document.getElementById("booking");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const heroTitle = settings?.heroTitle || "Premium Taxi Service in Larnaca";
  const heroSubtitle = settings?.heroSubtitle || "Experience the most reliable airport transfers and city rides in your city. Our professional drivers ensure a safe, comfortable, and punctual journey with fixed prices and no hidden fees.";
  const heroButtonText = settings?.heroButtonText || "Book Your Ride";
  const heroImageUrl = settings?.heroImageUrl || "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070&auto=format&fit=crop";

  return (
    <section className="relative h-[80vh] flex items-center justify-center bg-taxi-dark-navy text-white overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
        style={{ backgroundImage: `url('${heroImageUrl}')` }}
      >
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-taxi-dark-navy z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#060b14] via-transparent to-transparent z-10" />

      {/* Animated Grid */}
      <div className="absolute inset-0 opacity-10 z-0"
        style={{ backgroundImage: 'linear-gradient(rgba(191,149,63,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(191,149,63,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }}
      />

      <div className="relative z-20 container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 inline-block bg-gradient-to-r from-[#FCF6BA] to-[#BF953F] bg-clip-text text-transparent tracking-wide animate-[shine_4s_linear_infinite] bg-[length:200%_auto]">
          {heroTitle}
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-gray-200 max-w-3xl mx-auto leading-relaxed">
          {heroSubtitle}
        </p>
        <Button
          onClick={scrollToBooking}
          className="group relative overflow-hidden bg-taxi-gold-gradient hover:brightness-110 transition-all text-taxi-dark-navy font-bold text-lg px-10 py-6 h-auto shadow-[0_0_30px_rgba(191,149,63,0.4)] border border-taxi-gold-light/20 rounded-full before:absolute before:inset-0 before:-translate-x-full before:group-hover:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:z-0"
        >
          <span className="relative z-10 flex items-center gap-2">
            {heroButtonText}
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </Button>
      </div>
    </section>
  );
}
