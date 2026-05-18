"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  Tag,
  Ticket,
  BarChart3,
  Settings,
  MapPin,
  Star,
  UserCircle,
  HelpCircle
} from "lucide-react";

export function AdminNav() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/trips", label: "Trips", icon: MapPin },
    { href: "/admin/vehicles", label: "Fleet", icon: Car },
    { href: "/admin/drivers", label: "Drivers", icon: UserCircle },
    { href: "/admin/tariffs", label: "Tariff Plans", icon: Tag },
    { href: "/admin/discounts", label: "Discounts", icon: Ticket },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/reviews", label: "Reviews", icon: Star },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-6">
            <Link href="/admin">
              <h2 className="text-2xl font-bold whitespace-nowrap">Admin Dashboard</h2>
            </Link>
            <nav className="hidden md:flex items-center space-x-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${pathname === link.href
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center">
            <Link
              href="/admin/settings"
              className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"
            >
              <Settings className="w-6 h-6" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
