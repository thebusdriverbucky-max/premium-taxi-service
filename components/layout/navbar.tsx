// File: components/layout/navbar.tsx

"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Menu, X, Sun, Moon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { useSettings } from "@/components/providers/settings-provider";

export function Navbar() {
  const { settings } = useSettings();
  const storeName = settings?.companyName || process.env.NEXT_PUBLIC_STORE_NAME || 'Taxi Service';
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <nav className="bg-taxi-dark-navy sticky top-0 z-50 shadow-[0_2px_15px_rgba(0,0,0,0.5)] border-b border-taxi-gold-DEFAULT/10">
      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="relative flex items-center justify-between h-10 md:h-auto">

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 -ml-2 text-white hover:text-taxi-gold-DEFAULT transition-colors flex items-center justify-center"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Left: Navigation Links (Desktop) */}
          <div className="hidden md:flex gap-8 items-center flex-1">
            <Link
              href="/"
              className={`text-lg font-medium transition-colors relative after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:bg-white after:transition-all after:duration-300 ${pathname === "/"
                ? "text-white after:w-full"
                : "text-white/70 hover:text-white after:w-0 hover:after:w-full"
                }`}
            >
              Home
            </Link>
            <Link
              href="/booking"
              className={`text-lg font-medium transition-colors relative after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:bg-white after:transition-all after:duration-300 ${pathname.startsWith("/booking")
                ? "text-white after:w-full"
                : "text-white/70 hover:text-white after:w-0 hover:after:w-full"
                }`}
            >
              Book a Trip
            </Link>
            {session && (
              <Link
                href="/trips"
                className={`text-lg font-medium transition-colors relative after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:bg-white after:transition-all after:duration-300 ${pathname.startsWith("/trips")
                  ? "text-white after:w-full"
                  : "text-white/70 hover:text-white after:w-0 hover:after:w-full"
                  }`}
              >
                My Trips
              </Link>
            )}
            {session?.user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className={`text-lg font-medium transition-colors relative after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:bg-white after:transition-all after:duration-300 ${pathname.startsWith("/admin")
                  ? "text-white after:w-full"
                  : "text-white/70 hover:text-white after:w-0 hover:after:w-full"
                  }`}
              >
                Admin
              </Link>
            )}
          </div>

          {/* Center: Logo */}
          <Link
            href="/"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
          >
            {settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={storeName}
                className="h-8 md:h-12 w-auto object-contain max-w-[calc(100vw-120px)] md:max-w-none"
              />
            ) : (
              <span className="text-xl md:text-3xl font-extrabold bg-taxi-gold-gradient bg-clip-text text-transparent uppercase tracking-widest truncate max-w-[calc(100vw-120px)] md:max-w-none">
                {storeName}
              </span>
            )}
          </Link>

          {/* Right: Book Now + Auth */}
          <div className="flex gap-4 items-center flex-1 justify-end">
            <Link
              href="/booking"
              className="hidden md:block bg-taxi-gold-gradient hover:brightness-110 text-taxi-dark-navy px-6 py-2 rounded-full font-bold transition-all shadow-[0_0_15px_rgba(191,149,63,0.3)]"
            >
              Book Now
            </Link>

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                <User className="w-6 h-6 text-white" />
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-taxi-dark-navy rounded-md shadow-xl py-1 border border-taxi-gold-DEFAULT/20">
                  {session ? (
                    <>
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-base text-gray-300 hover:text-taxi-gold-DEFAULT hover:bg-white/5"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        My Profile
                      </Link>
                      {session.user.role === "ADMIN" && (
                        <Link
                          href="/admin"
                          className="block px-4 py-2 text-base text-gray-300 hover:text-taxi-gold-DEFAULT hover:bg-white/5"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Admin Panel
                        </Link>
                      )}
                      <Link
                        href="/trips"
                        className="block px-4 py-2 text-base text-gray-300 hover:text-taxi-gold-DEFAULT hover:bg-white/5"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        My Trips
                      </Link>
                      <button
                        onClick={() => signOut()}
                        className="block w-full text-left px-4 py-2 text-base text-red-400 hover:bg-white/5"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/login?callbackUrl=${pathname}`}
                        className="block px-4 py-2 text-base text-gray-300 hover:text-taxi-gold-DEFAULT hover:bg-white/5"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Sign In
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 border-t border-white/10 pt-4">
            <div className="flex flex-col gap-4">
              <Link
                href="/"
                className={`text-lg font-medium transition-colors w-fit relative after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:bg-white after:transition-all after:duration-300 ${pathname === "/"
                  ? "text-white after:w-full"
                  : "text-white/70 hover:text-white after:w-0 hover:after:w-full"
                  }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/booking"
                className={`text-lg font-medium transition-colors w-fit relative after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:bg-white after:transition-all after:duration-300 ${pathname.startsWith("/booking")
                  ? "text-white after:w-full"
                  : "text-white/70 hover:text-white after:w-0 hover:after:w-full"
                  }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Book a Trip
              </Link>
              {session?.user?.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className={`text-lg font-medium transition-colors w-fit relative after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:bg-white after:transition-all after:duration-300 ${pathname.startsWith("/admin")
                    ? "text-white after:w-full"
                    : "text-white/70 hover:text-white after:w-0 hover:after:w-full"
                    }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Admin Panel
                </Link>
              )}
              {session && (
                <Link
                  href="/trips"
                  className={`text-lg font-medium transition-colors w-fit relative after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:bg-white after:transition-all after:duration-300 ${pathname.startsWith("/trips")
                    ? "text-white after:w-full"
                    : "text-white/70 hover:text-white after:w-0 hover:after:w-full"
                    }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  My Trips
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
