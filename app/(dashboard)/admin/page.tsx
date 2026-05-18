// app/(dashboard)/admin/page.tsx
import { auth } from "@/lib/auth"; // Импортируем auth из вашей конфигурации
import { redirect } from "next/navigation";
import Link from "next/link";
import { Car, Tag, BarChart3, Ticket, Settings, MapPin, Star, UserCircle } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const session = await auth(); // Используем auth() вместо getServerSession

  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  const cards = [
    {
      href: "/admin/trips",
      title: "Trips",
      icon: MapPin,
      description: "View and manage trip bookings",
      color: "text-green-500",
    },
    {
      href: "/admin/vehicles",
      title: "Fleet",
      icon: Car,
      description: "Manage your vehicle fleet",
      color: "text-indigo-500",
    },
    {
      href: "/admin/drivers",
      title: "Drivers",
      icon: UserCircle,
      description: "Manage your professional drivers",
      color: "text-amber-500",
    },
    {
      href: "/admin/tariffs",
      title: "Tariff Plans",
      icon: Tag,
      description: "Manage pricing and service types",
      color: "text-blue-500",
    },
    {
      href: "/admin/discounts",
      title: "Discounts",
      icon: Ticket,
      description: "Manage promo codes and discounts",
      color: "text-orange-500",
    },
    {
      href: "/admin/analytics",
      title: "Analytics",
      icon: BarChart3,
      description: "Trip and performance metrics",
      color: "text-purple-500",
    },
    {
      href: "/admin/reviews",
      title: "Reviews",
      icon: Star,
      description: "Manage customer reviews",
      color: "text-yellow-500",
    },
    {
      href: "/admin/settings",
      title: "Settings",
      icon: Settings,
      description: "Configure your service settings",
      color: "text-gray-400",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-extrabold mb-10 bg-gradient-to-l from-[#FCF6BA] to-[#BF953F] bg-clip-text text-transparent">
        Admin Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="group">
              <div className="h-full bg-[#1e293b]/50 backdrop-blur-md rounded-2xl border border-white/10 p-8 hover:border-white/20 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] transition-all duration-500 hover:scale-[1.02] flex flex-col justify-between relative overflow-hidden">
                {/* Subtle glow effect on hover */}
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-taxi-gold-DEFAULT/5 rounded-full blur-3xl group-hover:bg-taxi-gold-DEFAULT/10 transition-colors duration-500" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold bg-gradient-to-l from-[#FCF6BA] to-[#BF953F] bg-clip-text text-transparent">
                      {card.title}
                    </h3>
                    <div className={`p-3 rounded-xl bg-white/5 group-hover:bg-white/10 transition-all duration-300 group-hover:rotate-6 ${card.color}`}>
                      <Icon className="w-8 h-8" />
                    </div>
                  </div>
                  <p className="text-gray-400 text-lg leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
                    {card.description}
                  </p>
                </div>
                <div className="mt-8 flex items-center text-taxi-gold-DEFAULT font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-[-10px] group-hover:translate-x-0 relative z-10">
                  Manage {card.title} <span className="ml-2 transition-transform group-hover:translate-x-1">&rarr;</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
