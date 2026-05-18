'use client';

import { useSettings } from '@/components/providers/settings-provider';
import { MessageSquare } from 'lucide-react';

export function WhatsAppButton() {
  const { settings } = useSettings();

  if (!settings?.whatsappNumber) return null;

  const whatsappUrl = `https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#25D366] text-white rounded-full shadow-lg hover:scale-110 transition-transform duration-300 group"
      aria-label="Contact us on WhatsApp"
    >
      <MessageSquare className="w-7 h-7 fill-current" />
      <span className="absolute right-full mr-4 px-3 py-1 bg-white text-gray-800 text-sm font-medium rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
        Chat with us
      </span>
    </a>
  );
}
