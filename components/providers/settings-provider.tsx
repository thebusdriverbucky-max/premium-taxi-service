"use client";

import React, { createContext, useContext, ReactNode } from "react";
import type { PublicStoreSettings } from "@/lib/public-settings";

interface SettingsContextType {
  settings: PublicStoreSettings | null;
  currency: string;
  cardPaymentsConfigured: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({
  children,
  initialSettings,
  cardPaymentsConfigured = false,
}: {
  children: ReactNode;
  initialSettings: PublicStoreSettings | null;
  cardPaymentsConfigured?: boolean;
}) {
  const currency = initialSettings?.currency || "USD";

  return (
    <SettingsContext.Provider value={{ settings: initialSettings, currency, cardPaymentsConfigured }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
