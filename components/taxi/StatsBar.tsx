"use client";
import { useSettings } from "@/components/providers/settings-provider";

export function StatsBar() {
  const { settings } = useSettings();

  const stats = [
    { value: settings?.statsBar1Value || "1,200+", label: settings?.statsBar1Label || "Trips Completed", icon: "🚕" },
    { value: settings?.statsBar2Value || "950+", label: settings?.statsBar2Label || "Happy Clients", icon: "😊" },
    { value: settings?.statsBar3Value || "5+", label: settings?.statsBar3Label || "Years of Service", icon: "🏆" },
    { value: settings?.statsBar4Value || "4.9 ★", label: settings?.statsBar4Label || "Rating", icon: "⭐" },
  ];

  return (
    <div className="bg-[#0a0f1a] border-y border-taxi-gold-DEFAULT/20 py-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl md:text-3xl font-bold bg-taxi-gold-gradient bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

