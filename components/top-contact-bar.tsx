"use client";

import { Phone } from "lucide-react";
import { useSettings } from "@/components/providers/settings-provider";
import { useState, useEffect } from "react";

export function TopContactBar() {
  const { settings } = useSettings();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    };

    // Set initial state based on current scroll position
    handleScroll();

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const phoneNumber = settings?.phoneNumber || "+357 XXXX XX XX";
  const whatsappNumber = settings?.whatsappNumber;
  const workingHours = settings?.workingHours || "Book 24 hours in advance";

  return (
    <div
      className={`grid transition-all duration-300 ease-in-out ${
        isVisible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden">
        <div className="bg-taxi-gold-gradient py-2 text-taxi-dark-navy">
          <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-2 md:gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-taxi-dark-navy/10 flex items-center justify-center">
                  <Phone className="w-3 h-3 text-taxi-dark-navy" />
                </div>
                <a href={`tel:${phoneNumber}`} className="text-taxi-dark-navy font-bold text-sm md:text-base hover:text-taxi-dark-navy/80 transition-colors">
                  {phoneNumber}
                </a>
              </div>

              {whatsappNumber && (
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-taxi-dark-navy/10 flex items-center justify-center">
                    <span className="text-taxi-dark-navy text-sm">💬</span>
                  </div>
                  <a
                    href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-taxi-dark-navy font-bold text-sm md:text-base hover:text-taxi-dark-navy/80 transition-colors"
                  >
                    WhatsApp
                  </a>
                </div>
              )}
            </div>

            <div className="hidden md:flex text-xs md:text-sm text-taxi-dark-navy font-medium items-center gap-2">
              <span className="text-taxi-dark-navy">📅</span>
              {workingHours}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
