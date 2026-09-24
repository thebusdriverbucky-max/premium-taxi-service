"use client";

import React, { createContext, useContext, ReactNode } from "react";
import type { PublicStoreSettings } from "@/lib/public-settings";

interface SettingsContextType {
  settings: PublicStoreSettings | null;
  currency: string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({
  children,
  initialSettings,
}: {
  children: ReactNode;
  initialSettings: PublicStoreSettings | null;
}) {
  const currency = initialSettings?.currency || "USD";

  return (
    <SettingsContext.Provider value={{ settings: initialSettings, currency }}>
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
