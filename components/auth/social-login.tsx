"use client";

import { signIn } from "next-auth/react";
import { Chrome } from "lucide-react";

export function SocialLogin() {
  const handleSocialLogin = (provider: "google") => {
    signIn(provider, { callbackUrl: "/" });
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => handleSocialLogin("google")}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-taxi-gold/30 rounded-lg shadow-sm text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 hover:border-taxi-gold/60 transition-all duration-200"
      >
        <Chrome className="w-5 h-5 text-taxi-gold" />
        <span>Continue with Google</span>
      </button>
    </div>
  );
}
