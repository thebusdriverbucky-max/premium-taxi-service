// File: components/layout/footer.tsx

"use client";

import Link from "next/link";
import { useSettings } from "@/components/providers/settings-provider";

export function Footer() {
  const { settings } = useSettings();

  const year = new Date().getFullYear();
  const storeName = settings?.companyName || 'Taxi Service';
  const copyright = settings?.footerCopyright || `© ${year} ${storeName}. All rights reserved.`;

  return (
    <footer className="bg-taxi-dark-navy text-gray-300 border-t border-white/10">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-bold mb-4">About</h3>
            <ul className="space-y-2">
              <li><Link href="/about" className="hover:text-white">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
              <li><Link href="/cookies" className="hover:text-white">Cookies</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold mb-4">Follow</h3>
            <ul className="space-y-2">
              {settings?.tiktokUrl && (
                <li>
                  <a
                    href={settings.tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white"
                  >
                    TikTok
                  </a>
                </li>
              )}
              {settings?.facebookUrl && (
                <li>
                  <a
                    href={settings.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white"
                  >
                    Facebook
                  </a>
                </li>
              )}
              {settings?.instagramUrl && (
                <li>
                  <a
                    href={settings.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white"
                  >
                    Instagram
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 mt-8 pt-8 text-center">
          <p>{copyright}</p>
        </div>
      </div>
    </footer>
  );
}
