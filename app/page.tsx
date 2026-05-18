import { Hero } from "@/components/taxi/Hero";
import { StatsBar } from "@/components/taxi/StatsBar";
import { BookingForm } from "@/components/taxi/BookingForm";
import { Services } from "@/components/taxi/Services";
import { Features } from "@/components/taxi/Features";
import { FamilyBusiness } from "@/components/taxi/FamilyBusiness";
import { Tariffs } from "@/components/taxi/Tariffs";
import { Reviews } from "@/components/taxi/Reviews";

export default function Home() {
  const divider = (
    <div className="h-px bg-gradient-to-r from-transparent via-[#BF953F]/60 to-transparent" />
  );

  const patternStyle = {
    backgroundImage: `radial-gradient(circle at 2px 2px, rgba(191, 149, 63, 0.07) 1px, transparent 0)`,
    backgroundSize: "40px 40px",
  };

  return (
    <main className="min-h-screen bg-[#060b14] text-white selection:bg-[#BF953F]/30">
      {/* Hero Section */}
      <div className="relative bg-[#060b14]">
        <div className="absolute inset-0" style={patternStyle} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,_#BF953F25_0%,_transparent_50%)]" />
        <Hero />
      </div>

      <StatsBar />

      {divider}

      {/* Family Business Section */}
      <div className="relative bg-[#0a0f1a]">
        <div className="absolute inset-0 opacity-50" style={patternStyle} />
        <FamilyBusiness />
      </div>

      {divider}

      {/* Booking Section */}
      <div id="booking" className="relative bg-[#0d1424]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#BF953F15_0%,_transparent_70%)]" />
        <BookingForm />
      </div>

      {divider}

      {/* Services Section */}
      <div className="relative bg-[#040810]">
        <div className="absolute inset-0" style={patternStyle} />
        <Services />
      </div>

      {divider}

      {/* Tariffs Section */}
      <div className="relative bg-[#060b14]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_#BF953F10_0%,_transparent_50%)]" />
        <Tariffs />
      </div>

      {divider}

      {/* Features Section */}
      <div className="relative bg-[#0a0f1a]">
        <div className="absolute inset-0 opacity-50" style={patternStyle} />
        <Features />
      </div>

      {divider}

      {/* Reviews Section */}
      <div className="relative bg-[#0d1424]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_#BF953F10_0%,_transparent_50%)]" />
        <Reviews />
      </div>
    </main>
  );
}
