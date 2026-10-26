"use client";

import { useEffect, useState } from "react";
import { getProviders } from "next-auth/react";

/**
 * True once NextAuth confirms a "google" provider is registered server-side
 * (GOOGLE_ID and GOOGLE_SECRET are both set). Starts false so the button
 * never flashes on an unconfigured deployment.
 */
export function useGoogleSignInEnabled() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    getProviders()
      .then((providers) => setEnabled(Boolean(providers?.google)))
      .catch(() => setEnabled(false));
  }, []);

  return enabled;
}
