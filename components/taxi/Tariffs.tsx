import { db as prisma } from "@/lib/db";
import Image from "next/image";
import { Check, Users, Briefcase } from "lucide-react";
import { ScrollContainer } from "@/components/ui/ScrollContainer";
import { TariffBookButton } from "@/components/taxi/TariffBookButton";

function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    EUR: "€",
    USD: "$",
    GBP: "£",
  };
  return symbols[currency?.toUpperCase()] || currency || "€";
}

export async function Tariffs() {
  const tariffs = await prisma.tariffPlan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  if (tariffs.length === 0) return null;

  return (
    <section className="py-24 bg-taxi-dark-navy relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-luxury-pattern opacity-5 pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-taxi-gold-gradient bg-clip-text text-transparent inline-block">
            Our Fleet & Tariffs
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Premium transportation services tailored to your needs.
            Fixed prices, professional drivers, and ultimate comfort.
          </p>
        </div>

        {/* Горизонтальный скролл-контейнер */}
        <div className="relative">
          {/* Fade-эффекты по краям */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-taxi-dark-navy to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-taxi-dark-navy to-transparent z-10 pointer-events-none" />

          <ScrollContainer className="flex gap-6 pb-4 px-2 snap-x snap-mandatory">
            {tariffs.map((tariff) => (
              <div
                key={tariff.id}
                className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-taxi-gold/50 transition-all duration-500 group flex flex-col backdrop-blur-sm
                  flex-shrink-0 w-[85vw] sm:w-[70vw] snap-center
                  md:w-[400px] md:snap-none"
              >
                {tariff.image && (
                  <div className="relative h-52 mb-8 rounded-2xl overflow-hidden">
                    <Image
                      src={tariff.image}
                      alt={tariff.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-taxi-dark-navy/80 to-transparent opacity-60" />
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-taxi-gold transition-colors">
                    {tariff.name}
                  </h3>
                  <p className="text-gray-400 text-sm line-clamp-2">
                    {tariff.description}
                  </p>
                </div>

                <div className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-bold text-white">{getCurrencySymbol(tariff.currency)}{tariff.basePrice.toString()}</span>
                    <span className="text-gray-400 text-sm">base</span>
                  </div>
                  <div className="text-taxi-gold font-semibold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-taxi-gold" />
                    {getCurrencySymbol(tariff.currency)}{tariff.pricePerKm.toString()} per km
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="flex items-center gap-2 text-gray-300">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <Users className="w-4 h-4 text-taxi-gold" />
                    </div>
                    <span className="text-sm">{tariff.maxPassengers} Seats</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <Briefcase className="w-4 h-4 text-taxi-gold" />
                    </div>
                    <span className="text-sm">{tariff.maxLuggage} Bags</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-grow">
                  {tariff.features.slice(0, 4).map((feature, index) => (
                    <li key={index} className="flex items-center gap-3 text-gray-400 text-sm">
                      <Check className="w-4 h-4 text-taxi-gold shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <TariffBookButton tariffId={tariff.id} tariffName={tariff.name} />
              </div>
            ))}
          </ScrollContainer>
        </div>
      </div>
    </section>
  );
}
