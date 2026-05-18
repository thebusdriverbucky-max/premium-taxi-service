'use client';

import { useState, useEffect } from 'react';

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const cookieConsent = localStorage.getItem('cookie-consent');
    if (!cookieConsent) {
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('cookie-consent', 'all');
    setShowBanner(false);
  };

  const handleEssentialOnly = () => {
    localStorage.setItem('cookie-consent', 'essential');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-taxi-dark-navy/95 backdrop-blur-md text-white p-4 z-50 border-t border-taxi-gold-DEFAULT/20 shadow-[0_-4px_30px_rgba(0,0,0,0.4)]">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm mb-1 font-semibold text-white">🍪 This site uses cookies</p>
          <p className="text-xs text-gray-400">
            We use <strong className="text-gray-300">essential cookies</strong> for authentication and booking functionality.
            Optional cookies help us analyze site usage. Read our{" "}
            <a href="/privacy" className="text-taxi-gold-DEFAULT hover:underline">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href="/cookies" className="text-taxi-gold-DEFAULT hover:underline">
              Cookie Policy
            </a>.
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <button
            onClick={handleEssentialOnly}
            className="px-4 py-2 text-sm border border-white/20 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200 whitespace-nowrap"
          >
            Essential Only
          </button>
          <button
            onClick={handleAcceptAll}
            className="px-5 py-2 text-sm font-bold rounded-lg whitespace-nowrap text-taxi-dark-navy transition-all duration-200 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(191,149,63,0.3)]"
            style={{
              background: 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 50%, #B38728 100%)',
            }}
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
