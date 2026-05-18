"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-taxi-gold-light"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="your@email.com"
          className="w-full px-4 py-3 bg-slate-900/50 border border-taxi-gold/20 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-taxi-gold/50 focus:border-transparent text-white placeholder:text-gray-600 transition-all"
        />
      </div>
      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-taxi-gold-light"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          className="w-full px-4 py-3 bg-slate-900/50 border border-taxi-gold/20 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-taxi-gold/50 focus:border-transparent text-white placeholder:text-gray-600 transition-all"
        />
      </div>
      {error && <p className="text-sm text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</p>}
      <button
        type="submit"
        className="w-full py-4 bg-taxi-gold text-taxi-dark-navy font-bold rounded-lg shadow-lg shadow-taxi-gold/10 hover:bg-taxi-gold-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-taxi-gold transition-all"
      >
        Sign In
      </button>
    </form>
  );
}
